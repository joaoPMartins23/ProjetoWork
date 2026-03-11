import { MensagemService } from './../../services/mensagem.service';
import { Component, OnInit, HostListener, ElementRef, Output, EventEmitter, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import * as CryptoJS from 'crypto-js';
import { Subscription } from 'rxjs';
import { UiBridgeService } from 'src/app/services/unicos/UiBridge.service';

import { IMenu } from 'src/app/modules/menu.interface';
import { DadosMenu } from './dadosMenu';
import { environment } from 'src/environments/environment';
import { IUsuarioForm, IUsuarioView } from 'src/app/modules/cruds/cadastros/usuario.interface';
import { UsuarioService } from 'src/app/services/cruds/cadastros/usuario.service';

@Component({
  selector: 'app-menu-lateral',
  templateUrl: './menu-lateral.component.html',
  styleUrl: './menu-lateral.component.scss'
})
export class MenuLateralComponent implements OnInit, OnDestroy {
  @Output() menuFechadoChange = new EventEmitter<boolean>();

  private sub = new Subscription();

  protected isMobile = false;

  public menuFechado = true;
  private estadoAnteriorMenuFechado = false;
  private estadoAnteriorMenuFixado = false;

  public menuFixado = false;
  public usuarioMenuAberto = false;

  protected formularioPesquisa!: FormGroup;

  protected dadosMenu: IMenu[] = DadosMenu;
  protected nomeUsuario = '';

  protected rotas: any[] = [];
  protected rotasFiltradas: any[] = [];

  private readonly ID_TI = '58D91F39-BD92-40D0-BFC1-D6C8D7103ABD';
  public ehTI = false;

  private departamentoResponsavelIDAtual: string = '';

  public pesquisaAtiva = false;

  protected perfilArmazenado = localStorage.getItem('PerfilAcesso');
  protected perfilAcessoUsuario: string = this.perfilArmazenado
    ? CryptoJS.AES.decrypt(this.perfilArmazenado, environment.chavePrivada).toString(CryptoJS.enc.Utf8)
    : '';

  protected usuarioID: string = CryptoJS.AES.decrypt(
    localStorage.getItem('UsuarioID') || '',
    environment.chavePrivada
  ).toString(CryptoJS.enc.Utf8);

  protected usuarioAtual!: IUsuarioView;

  // ===== Overlay de edição de usuário =====
  public overlayUsuarioAberto = false;
  protected formularioUsuario!: FormGroup;
  protected imagemUsuario: string = '';
  protected mostrarSenha: boolean = false;


  constructor(
    private usuarioService: UsuarioService,
    private mensagemService: MensagemService,
    private formBuilder: FormBuilder,
    private elementRef: ElementRef,
    private router: Router,
    private uiBridge: UiBridgeService,
  ) { }

  async ngOnInit(): Promise<void> {
    this.detectarMobile();
    window.addEventListener('resize', this.detectarMobile.bind(this));

    // forms existentes
    this.formularioPesquisa = this.formBuilder.group({ Pesquisa: [''] });

    this.formularioUsuario = this.formBuilder.group({
      Nome: ['', Validators.required],
      Email: ['', Validators.required],
      Telefone: [''],
      Imagem: [''],
      Senha: [''],
    });

    this.fecharTodosMenus();

    const nomeUsuarioArmazenado = localStorage.getItem('NomeUsuario');
    const nomeCompleto = nomeUsuarioArmazenado
      ? CryptoJS.AES.decrypt(nomeUsuarioArmazenado, environment.chavePrivada).toString(CryptoJS.enc.Utf8)
      : '';

    const partes = nomeCompleto.trim().split(' ');
    this.nomeUsuario = partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1]}` : nomeCompleto;

    const perfilUsuarioCripto = localStorage.getItem('PerfilAcesso');
    const perfilUsuario = perfilUsuarioCripto
      ? CryptoJS.AES.decrypt(perfilUsuarioCripto, environment.chavePrivada).toString(CryptoJS.enc.Utf8)
      : '';
    this.dadosMenu = this.filtrarMenuPorPerfil(DadosMenu, perfilUsuario);

    this.pegarRotas();

    // carrega usuário e preenche o form
    try {
      const usuario = await this.usuarioService.buscarUsuario(this.usuarioID).toPromise();
      if (usuario) {
        this.usuarioAtual = usuario;
        this.formularioUsuario.patchValue({
          Nome: usuario.Nome ?? '',
          Email: usuario.Email ?? '',
          Telefone: usuario.Telefone != '17999999999' ? this.formatarTelefoneParaExibicao(usuario.Telefone) : '',
          Imagem: usuario.Imagem ?? ''
        });

        this.imagemUsuario = usuario.Imagem ?? '';
      }
    } catch {
      // se falhar, mantemos o form vazio
    }

    const cripto = localStorage.getItem('DepartamentoResponsavelID') || '';
    let deptoId = '';
    if (cripto) {
      try {
        deptoId = CryptoJS.AES.decrypt(cripto, environment.chavePrivada).toString(CryptoJS.enc.Utf8) || '';
      } catch {
        // se não estiver criptografado, usa o valor bruto
        deptoId = cripto;
      }
    }

    // define se é TI (se não houver depto, fica false e não mostra)
    this.ehTI = !!deptoId && deptoId === this.ID_TI;

    this.departamentoResponsavelIDAtual = deptoId;

    this.sub.add(
      this.uiBridge.openUserEdit$.subscribe(() => {
        // garante o menu visível e o overlay aberto
        this.overlayUsuarioAberto = true;

        // foca no campo telefone (se tiver id no input)
        setTimeout(() => {
          const el = this.elementRef.nativeElement.querySelector('#telefone');
          el?.focus();
        }, 50);
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  // ===== Overlay handlers =====
  public abrirOverlayUsuario(): void {
    this.overlayUsuarioAberto = true;
  }

  public fecharOverlayUsuario(): void {
    this.overlayUsuarioAberto = false;
  }

  public salvarUsuario(): void {
    this.fecharOverlayUsuario();
  }

  // ===== Permissões / Menus =====
  private filtrarMenuPorPerfil(menus: IMenu[], perfil: string): IMenu[] {
    return menus
      .map(menu => {
        const submenusFiltrados = menu.Submenus
          ? menu.Submenus
            .map(sub => {
              const menuSubmenuFiltrado = sub.MenuSubmenu?.filter(sm =>
                this.temPermissaoPerfil(sm.PerfilAcesso, perfil)
              );
              const temAcessoAoSubmenu =
                this.temPermissaoPerfil(sub.PerfilAcesso, perfil) ||
                (menuSubmenuFiltrado && menuSubmenuFiltrado.length > 0);

              return temAcessoAoSubmenu ? { ...sub, MenuSubmenu: menuSubmenuFiltrado } : null;
            })
            .filter((sub): sub is any => sub !== null)
          : undefined; // <- **aqui**: se não tinha Submenus, fica undefined

        const temAcessoAoMenu =
          this.temPermissaoPerfil(menu.PerfilAcesso, perfil) ||
          (submenusFiltrados && submenusFiltrados.length > 0);

        if (!temAcessoAoMenu) return null;

        // só coloca a prop Submenus se ela existir
        return submenusFiltrados !== undefined
          ? { ...menu, Submenus: submenusFiltrados }
          : { ...menu };
      })
      .filter((menu): menu is any => menu !== null);
  }


  private temPermissaoPerfil(perfilDoMenu: string, perfilUsuario: string): boolean {
    const normalizar = (str: string) =>
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[\s-]/g, ''); // tira espaços e hífen, ex: "super administrador" → "superadministrador"

    const perfilUserNorm = normalizar(perfilUsuario);
    const perfilMenuNorm = normalizar(perfilDoMenu);

    // Superadmin enxerga tudo
    if (perfilUserNorm === 'superadministrador') return true;

    const hierarquia: any = {
      usuario: 1,
      tecnico: 2,
      administrador: 3,
      superadministrador: 4
    };

    return (hierarquia[perfilUserNorm] || 0) >= (hierarquia[perfilMenuNorm] || 0);
  }


  private detectarMobile(): void {
    this.isMobile = window.innerWidth <= 768;
    if (this.isMobile) {
      this.menuFechado = true;
      this.menuFixado = false;
    }
  }

  protected toggleMenuMobile(): void {
    if (this.isMobile) this.menuFechado = !this.menuFechado;
  }

  public obterLogoMenu(): string {
    if (this.isMobile) return '/assets/images/logos/logoVendaMaisSimplesColorido.png';
    return this.menuFechado ? '/assets/images/logos/logoVendaMaisSimplesColorido.png'
      : '/assets/images/logos/logoVendaMaisBranca.png';
  }

  private pegarRotas(): void {
    this.rotas = [];
    for (const menu of this.dadosMenu) {
      if (menu.Submenus) {
        for (const submenu of menu.Submenus) {
          if (submenu.MenuSubmenu) {
            for (const menuSubmenu of submenu.MenuSubmenu) {
              this.rotas.push({ rota: menuSubmenu.Rota, titulo: menuSubmenu.Titulo });
            }
          } else if (submenu.Rota) {
            this.rotas.push({ rota: submenu.Rota, titulo: submenu.Titulo });
          }
        }
      } else if (menu.Rota) {
        this.rotas.push({ rota: menu.Rota, titulo: menu.Titulo });
      }
    }
  }

  protected abrirFecharSubmenu(index: number): void {
    this.rotasFiltradas.length = 0;
    this.formularioPesquisa.setValue({ Pesquisa: '' });
    const submenuAtualmenteAberto = this.dadosMenu[index].SubmenusAberto;

    for (let i = 0; i < this.dadosMenu.length; i++) {
      if (i === index) {
        if (!submenuAtualmenteAberto) this.menuFechado = false;
        this.dadosMenu[i].SubmenusAberto = !submenuAtualmenteAberto;
        const subMenus = this.dadosMenu[i].Submenus;
        if (subMenus) {
          for (let c = 0; c < subMenus.length; c++) {
            subMenus[c].MenuSubmenuAberto = false;
          }
        }
      } else {
        this.dadosMenu[i].SubmenusAberto = false;
      }
    }
  }

  protected abrirFecharMenuSubmenu(indexMenu: number, indexSubmenu: number): void {
    const dadosMenu: IMenu = this.dadosMenu[indexMenu];
    this.rotasFiltradas.length = 0;
    this.formularioPesquisa.setValue({ Pesquisa: '' });
    if (dadosMenu.Submenus) {
      for (let i = 0; i < dadosMenu.Submenus.length; i++) {
        dadosMenu.Submenus[i].MenuSubmenuAberto = i === indexSubmenu
          ? !dadosMenu.Submenus[i].MenuSubmenuAberto : false;
      }
    }
  }

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: any): void {
    const clickedInside = this.elementRef.nativeElement.contains(target);
    if (!clickedInside) {
      this.fecharTodosMenus();
      this.usuarioMenuAberto = false;
      this.pesquisaAtiva = false;
      this.formularioPesquisa.get('Pesquisa')?.setValue('');
    }
  }

  protected fecharTodosMenus(preservarMenuUsuario: boolean = false): void {
    // no mobile, só fecha o menu lateral se NÃO for a abertura do menu do usuário
    if (this.isMobile && !preservarMenuUsuario) this.menuFechado = true;

    for (let i = 0; i < this.dadosMenu.length; i++) {
      const dadosMenu: IMenu = this.dadosMenu[i];
      if (dadosMenu.Submenus) {
        for (let c = 0; c < dadosMenu.Submenus.length; c++) {
          const submenu = dadosMenu.Submenus[c];
          if (submenu.MenuSubmenu) submenu.MenuSubmenuAberto = false;
        }
        dadosMenu.SubmenusAberto = false;
      }
    }
  }

  protected pesquisarPagina(): void {
    const valorPesquisa: string = this.formularioPesquisa.get('Pesquisa')?.value;
    this.rotasFiltradas.length = 0;
    if (valorPesquisa !== '') {
      for (let i = 0; i < this.rotas.length; i++) {
        if (this.rotas[i].titulo.toLowerCase().includes(valorPesquisa.toLowerCase())) {
          this.rotasFiltradas.push(this.rotas[i]);
        }
      }
    }
  }

  protected navegarPagina(rota: string): void {
    this.rotasFiltradas.length = 0;
    this.formularioPesquisa.setValue({ Pesquisa: '' });
    this.router.navigate([`/${rota}`]);
    if (this.isMobile) this.menuFechado = true; // << fecha no mobile
  }

  public logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  protected abrirFecharUsuarioMenu(): void {
    if (this.menuFechado) {
      this.menuFechado = false;
      this.menuFechadoChange.emit(this.menuFechado);
    }
    this.usuarioMenuAberto = !this.usuarioMenuAberto;
    this.pesquisaAtiva = false;
    this.formularioPesquisa.get('Pesquisa')?.setValue('');

    // aqui preserva o menu lateral no mobile ao abrir o menu do usuário
    this.fecharTodosMenus(true);
  }

  protected expandirMenu(): void {
    this.menuFechado = false;
    this.menuFechadoChange.emit(this.menuFechado);
  }

  protected retrairMenu(): void {
    if (!this.menuFixado) {
      this.menuFechado = true;
      this.menuFechadoChange.emit(this.menuFechado);
      this.fecharTodosMenus();
      this.usuarioMenuAberto = false;
    }
  }

  protected alternarFixarMenu(): void {
    this.menuFixado = !this.menuFixado;
    if (!this.menuFixado && this.pesquisaAtiva) this.fecharPesquisa();
  }

  protected ativarPesquisa(): void {
    if (this.pesquisaAtiva) {
      this.pesquisaAtiva = false;
      this.formularioPesquisa.get('Pesquisa')?.setValue('');
      this.menuFechado = this.estadoAnteriorMenuFechado;
      this.menuFixado = this.estadoAnteriorMenuFixado;
      return;
    }
    this.estadoAnteriorMenuFechado = this.menuFechado;
    this.estadoAnteriorMenuFixado = this.menuFixado;

    this.pesquisaAtiva = true;
    this.menuFechado = false;
    this.menuFixado = true;
    this.usuarioMenuAberto = false;
    this.fecharTodosMenus();

    setTimeout(() => {
      const input = this.elementRef.nativeElement.querySelector('#inputPesquisaMenu');
      input?.focus();
    }, 50);
  }

  protected fecharPesquisa(): void {
    this.pesquisaAtiva = false;
    this.menuFechado = this.estadoAnteriorMenuFechado;
    this.menuFixado = this.estadoAnteriorMenuFixado;
    this.formularioPesquisa.setValue({ Pesquisa: '' });
    this.rotasFiltradas.length = 0;
  }

  protected temPermissao(perfilItem: string): boolean {
    const perfilUsuario = this.pegarPerfilUsuario();

    const normalizar = (str: string) =>
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[\s-]/g, '');

    const perfilUserNorm = normalizar(perfilUsuario);
    const perfilItemNorm = normalizar(perfilItem);

    // Superadmin enxerga tudo
    if (perfilUserNorm === 'superadministrador') return true;

    const hierarquia: any = {
      usuario: 1,
      tecnico: 2,
      administrador: 3,
      superadministrador: 4
    };

    return (hierarquia[perfilUserNorm] || 0) >= (hierarquia[perfilItemNorm] || 0);
  }


  private pegarPerfilUsuario(): string {
    const perfilCriptografado = localStorage.getItem('PerfilAcesso');
    if (!perfilCriptografado) return '';
    try {
      return CryptoJS.AES.decrypt(perfilCriptografado, environment.chavePrivada)
        .toString(CryptoJS.enc.Utf8)
        .toLowerCase();
    } catch {
      return '';
    }
  }

  private formatarTelefoneParaExibicao(telefone: string): string {
    if (!telefone) return '';
    const numeros = telefone.replace(/\D/g, '');
    if (numeros.length === 11) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
    if (numeros.length === 10) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    return telefone;
  }

  protected converterImagemBase64(event: any): void {
    const file: File = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.imagemUsuario = base64;
      this.formularioUsuario.get('Imagem')?.setValue(base64);
    };

    reader.readAsDataURL(file);
  }

  protected editarUsuario(): void {
    if (this.formularioUsuario.valid) { }
    const usuarioEnviar: IUsuarioForm = {
      Nome: this.formularioUsuario.get('Nome')?.value,
      Email: this.formularioUsuario.get('Email')?.value,
      Senha: this.formularioUsuario.get('Senha')?.value,
      Telefone: this.formularioUsuario.get('Telefone')?.value != ''
        ? this.formularioUsuario.get('Telefone')?.value.replace(/\D/g, '')
        : '17999999999',
      DepartamentoID: this.usuarioAtual.DepartamentoID,
      DepartamentoResponsavelID: this.usuarioAtual.DepartamentoResponsavelID || null,
      PerfilAcessoID: this.usuarioAtual.PerfilAcesso,
      Imagem: this.formularioUsuario.get('Imagem')?.value,
      Ativo: this.usuarioAtual.Ativo
    };

    this.usuarioService.atualizarUsuario(this.usuarioID, usuarioEnviar).subscribe({
      next: () => {
        localStorage.setItem('Telefone',
          CryptoJS.AES.encrypt(usuarioEnviar.Telefone || '', environment.chavePrivada).toString()
        );
        this.overlayUsuarioAberto = false;
        this.mensagemService.adicionarMensagem('Usuário atualizado com sucesso!');
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao atualizar usuário. Por favor, tente novamente.');
      }
    });
  }

  protected mascararTelefone(): void {
    const controle = this.formularioUsuario.get('Telefone');
    if (!controle) return;

    const numeros = controle.value.replace(/\D/g, '').slice(0, 11);
    let formatado = numeros;

    if (numeros.length >= 2) {
      formatado = `(${numeros.slice(0, 2)}`;
    }
    if (numeros.length >= 7) {
      formatado += `) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
    } else if (numeros.length > 2) {
      formatado += `) ${numeros.slice(2)}`;
    }

    controle.setValue(formatado, { emitEvent: false });
  }

  protected alternarVisibilidadeSenha(): void {
    this.mostrarSenha = !this.mostrarSenha;
  }

  protected temAcessoDepartamento(item: IMenu): boolean {
    // se o menu não exige depto específico, libera
    if (!item.DepartamentoResponsavelID) return true;

    // se exige, compara com o depto do usuário
    return item.DepartamentoResponsavelID === this.departamentoResponsavelIDAtual;
  }
}
