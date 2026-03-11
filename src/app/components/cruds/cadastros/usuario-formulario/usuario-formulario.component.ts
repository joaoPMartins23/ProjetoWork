import { Component, OnInit, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { IDepartamentoResponsavel } from 'src/app/modules/chamados/departamentoResponsavel.interface';
import { IDepartamentoView } from 'src/app/modules/cruds/cadastros/departamento.interface';
import { IUsuarioForm, IUsuarioView } from 'src/app/modules/cruds/cadastros/usuario.interface';
import { IPerfilAcesso } from 'src/app/modules/unicos/perfilAcesso.interface';
import { DepartamentoResponsavelService } from 'src/app/services/chamados/departamentoResponsavel.service';
import { DepartamentoService } from 'src/app/services/cruds/cadastros/departamento.service';
import { UsuarioService } from 'src/app/services/cruds/cadastros/usuario.service';
import { MensagemService } from 'src/app/services/mensagem.service';
import { PerfilAcessoService } from 'src/app/services/unicos/perfilAcesso.service';

@Component({
  selector: 'app-usuario-formulario',
  templateUrl: './usuario-formulario.component.html',
  styleUrl: './usuario-formulario.component.scss'
})
export class UsuarioFormularioComponent implements OnInit {
  protected urlAtual = this.activatedRoute.snapshot.url;
  protected carregando: boolean = false;
  protected confirmacaoAtiva: boolean = false;

  protected usuarioID: string = '';
  protected usuarioAtual!: IUsuarioView;

  protected formularioUsuario!: FormGroup;
  protected imagemUsuario: string = '';
  protected imagemPreview: string | null = null;
  protected nomeArquivoImagem: string = '';

  protected mostrarSenha: boolean = false;

  protected departamentos: IDepartamentoView[] = [];

  protected departamentoResponsaveis: IDepartamentoResponsavel[] = [];

  protected perfis: IPerfilAcesso[] = [];

  protected nomeImagem: string | null = null;

  constructor(
    private usuarioService: UsuarioService,
    private departamentoService: DepartamentoService,
    private departamentoResponsavelService: DepartamentoResponsavelService,
    private perfilAcessoService: PerfilAcessoService,
    private mensagemService: MensagemService,
    private fb: FormBuilder,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private elementRef: ElementRef,
  ) { }

  async ngOnInit(): Promise<void> {
    try {
      this.carregando = true;

      this.formularioUsuario = this.fb.group({
        Nome: ['', Validators.required],
        Email: ['', [Validators.required, Validators.email]],
        Senha: [''],
        Telefone: [''],
        DepartamentoID: ['', Validators.required],
        DepartamentoResponsavelID: [''],
        PerfilAcessoID: ['', Validators.required],
        Imagem: [''],
        Ativo: [true]
      });

      this.departamentos = await this.departamentoService.buscarDepartamentos().toPromise() || [];
      this.departamentoResponsaveis = await this.departamentoResponsavelService.buscarDepartamentosResponsaveis().toPromise() || [];
      this.perfis = await this.perfilAcessoService.buscarPerfisAcesso().toPromise() || [];

      if (this.urlAtual.length == 3) {
        this.usuarioID = this.activatedRoute.snapshot.paramMap.get('UsuarioID') || '';
        this.usuarioAtual = await this.usuarioService.buscarUsuario(this.usuarioID).toPromise() || this.usuarioAtual;

        this.formularioUsuario.patchValue({
          Nome: this.usuarioAtual.Nome,
          Email: this.usuarioAtual.Email,
          Senha: '', // Senha não deve ser preenchida automaticamente
          Telefone: this.usuarioAtual.Telefone != '17999999999' ? this.formatarTelefoneParaExibicao(this.usuarioAtual.Telefone) : '',
          DepartamentoID: this.usuarioAtual.DepartamentoID,
          DepartamentoResponsavelID: this.usuarioAtual.DepartamentoResponsavelID || null,
          PerfilAcessoID: this.usuarioAtual.PerfilAcesso,
          Imagem: this.usuarioAtual.Imagem,
          Ativo: this.usuarioAtual.Ativo
        });

        this.imagemUsuario = this.usuarioAtual.Imagem;
      }
    }
    catch (err: any) {
      console.error(err);
    }
    finally {
      this.carregando = false;
    }
  }

  protected converterImagemBase64(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // CONFIG
    const MAX_MB = 2; // ajuste aqui
    const MAX_BYTES = MAX_MB * 1024 * 1024;
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp']; // opcional

    // 1) Tipo
    if (!tiposPermitidos.includes(file.type)) {
      this.mensagemService.adicionarMensagem('Formato inválido. Use JPG, PNG ou WEBP.');
      input.value = ''; // limpa para remover aviso/arquivo
      return;
    }

    // 2) Tamanho
    if (file.size > MAX_BYTES) {
      this.mensagemService.adicionarMensagem(`Imagem muito pesada. Máximo: ${MAX_MB}MB.`);
      input.value = ''; // limpa para remover aviso/arquivo
      return;
    }

    this.nomeArquivoImagem = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.imagemUsuario = base64;
      this.formularioUsuario.get('Imagem')?.setValue(base64);
    };

    reader.readAsDataURL(file);
  }

  onSubmit(): void {
    if (this.formularioUsuario.valid) {
      this.carregando = true;

      const usuario: IUsuarioForm = {
        Nome: this.formularioUsuario.get('Nome')?.value,
        Email: this.formularioUsuario.get('Email')?.value,
        Senha: this.formularioUsuario.get('Senha')?.value,
        Telefone: this.formularioUsuario.get('Telefone')?.value != '' ? this.limparTelefoneParaEnvio(this.formularioUsuario.get('Telefone')?.value) : '17999999999',
        DepartamentoID: this.formularioUsuario.get('DepartamentoID')?.value,
        DepartamentoResponsavelID: this.formularioUsuario.get('DepartamentoResponsavelID')?.value != '' ? this.formularioUsuario.get('DepartamentoResponsavelID')?.value : null,
        PerfilAcessoID: this.formularioUsuario.get('PerfilAcessoID')?.value,
        Imagem: this.formularioUsuario.get('Imagem')?.value,
        Ativo: this.formularioUsuario.get('Ativo')?.value
      }

      const mensagemSucesso = this.urlAtual.length == 3
        ? 'Usuário editado!'
        : 'Usuário criado!';

      const serviceCall = this.urlAtual.length == 3
        ? this.usuarioService.atualizarUsuario(this.usuarioID, usuario)
        : this.usuarioService.cadastrarUsuario(usuario);

      serviceCall.subscribe(() => {
        this.mensagemService.adicionarMensagem(mensagemSucesso);
        this.router.navigate(['/Usuarios']);
      }, (error: any) => {
        this.mensagemService.adicionarMensagem(error.error.Resposta);
        console.error(error.error.Resposta);
        this.carregando = false;
      });
    }
  }

  protected alternarVisibilidadeSenha(): void {
    this.mostrarSenha = !this.mostrarSenha;
  }

  protected alternarConfirmacao(): void {
    this.confirmacaoAtiva = !this.confirmacaoAtiva;
  }

  protected confirmarExclusao(): void {
    this.carregando = true;

    this.usuarioService.deletarUsuario(this.usuarioID).subscribe(() => {
      this.mensagemService.adicionarMensagem('Usuário excluído!');
      this.router.navigate(['/Usuarios']);
    }, (error: any) => {
      this.mensagemService.adicionarMensagem(error.error.Resposta);
      console.error(error.error.Resposta);
      this.carregando = false;
    });
  }

  private formatarTelefoneParaExibicao(telefone: string): string {
    if (!telefone) return '';
    const numeros = telefone.replace(/\D/g, '');

    if (numeros.length === 11) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
    } else if (numeros.length === 10) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    }

    return telefone;
  }

  private limparTelefoneParaEnvio(telefone: string): string {
    return telefone.replace(/\D/g, '');
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

}
