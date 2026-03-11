import { ProjetoService } from './../../../services/cruds/cadastros/projeto.service';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { forkJoin, of, Subject, firstValueFrom, timer } from 'rxjs';
import * as CryptoJS from 'crypto-js';
import { distinctUntilChanged, filter, map, takeUntil, debounceTime } from 'rxjs/operators';
import { catchError, timeout, take } from 'rxjs/operators';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import * as XLSX from 'xlsx';
import { Location } from '@angular/common';
import { UiBridgeService } from 'src/app/services/unicos/UiBridge.service';
import { HostListener } from '@angular/core';
import { ViewChild } from '@angular/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import { ChamadoRelatorioPrintComponent } from 'src/app/components/chamado-relatorio-print/chamado-relatorio-print.component';

import { environment } from 'src/environments/environment';
import { IChamadoForm, IChamadoView } from 'src/app/modules/chamados/chamado.interface';
import { ChamadoService } from 'src/app/services/chamados/chamado.service';
import { IUsuarioView } from 'src/app/modules/cruds/cadastros/usuario.interface';
import { IDepartamentoResponsavel } from 'src/app/modules/chamados/departamentoResponsavel.interface';
import { IServico } from 'src/app/modules/chamados/service.interface';
import { ITipoServico } from 'src/app/modules/chamados/service.interface';
import { UsuarioService } from 'src/app/services/cruds/cadastros/usuario.service';
import { DepartamentoResponsavelService } from 'src/app/services/chamados/departamentoResponsavel.service';
import { ServicoService } from 'src/app/services/chamados/servico.service';
import { IArquivo, IMensagem, IMensagemView } from 'src/app/modules/chamados/mensagem.interface';
import { MensagemChamadoService } from 'src/app/services/chamados/mensagemChamado.service';
import { NotificacaoService } from 'src/app/services/notificacao.service';
import { MensagemService } from 'src/app/services/mensagem.service';
import { WhatsappService } from 'src/app/services/chamados/whatsapp.service';
import { IWhatsappEnvio } from 'src/app/modules/chamados/whatsapp.interface';
import { IBloco } from 'src/app/modules/chamados/bloco.interface';
import { BlocoService } from 'src/app/services/chamados/bloco.service';
import { IHistoricoChamado } from 'src/app/modules/chamados/historicoChamado.interface';
import { HistoricoChamadoService } from 'src/app/services/chamados/historicoChamado.service';
import { IProjetoView } from 'src/app/modules/cruds/cadastros/projeto.interface';
import { notOnlyWhitespaceValidator } from 'src/app/helpers/notOnlyWhitespaceValidator';
import { IFormaContato } from 'src/app/modules/chamados/formaContato.interface';
import { ICategoria } from 'src/app/modules/chamados/categoria.interface';
import { IClienteView } from 'src/app/modules/cruds/cadastros/cliente.interface';
import { IProduto } from 'src/app/modules/chamados/produto.interface';
import { FormaContatoService } from 'src/app/services/chamados/formaContato.service';
import { CategoriaService } from 'src/app/services/chamados/categoria.service';
import { ClienteService } from 'src/app/services/cruds/cadastros/cliente.service';
import { ProdutoService } from 'src/app/services/chamados/produto.service';
import { DraftAttachmentsDbService } from 'src/app/services/unicos/draft-attachments.db.service';


@Component({
  selector: 'app-detalhes-chamados-sac',
  templateUrl: './detalhes-chamados-sac.component.html',
  styleUrl: './detalhes-chamados-sac.component.scss'
})
export class DetalhesChamadosSacComponent implements OnInit {
  protected carregando: boolean = true;

  protected showPhoneGuard = false;

  public alertaTelefoneAberto = false;

  private destroy$ = new Subject<void>();

  protected dataHoraInicio: string = this.getLocalISODateString(new Date());

  protected perfilAcessoUsuario: string = CryptoJS.AES.decrypt(localStorage.getItem('PerfilAcesso') || '', environment.chavePrivada).toString(CryptoJS.enc.Utf8);
  protected usuarioID: string = CryptoJS.AES.decrypt(localStorage.getItem('UsuarioID') || '', environment.chavePrivada).toString(CryptoJS.enc.Utf8);
  protected departamentoResponsavel: string | null = CryptoJS.AES.decrypt(localStorage.getItem('DepartamentoResponsavelID') || '', environment.chavePrivada).toString(CryptoJS.enc.Utf8) || null;

  protected chamadoAtual!: IChamadoView;
  protected chamadoID: string = '';

  protected nomeUsuarioCriacao: string = '';
  protected nomeUsuarioFinalizacao: string = '';

  protected formularioChamado!: FormGroup;

  arquivosSelecionados: { nome: string; base64: string; tipo: string }[] = [];

  prioridades = [
    { nome: 'Baixa', valor: 'Baixa' },
    { nome: 'Média', valor: 'Média' },
    { nome: 'Alta', valor: 'Alta' },
    { nome: 'Urgente', valor: 'Urgente' }
  ];

  protected usuarios: IUsuarioView[] = [];

  protected usuariosTecnicos: IUsuarioView[] = [];
  protected usuariosTecnicosPorDepartamento: IUsuarioView[] = [];

  protected departamentosResponsaveis: IDepartamentoResponsavel[] = [];

  protected servicos: IServico[] = [];
  protected servicosPorDepartamento: IServico[] = [];

  protected tiposServico: ITipoServico[] = [];

  protected blocos: IBloco[] = [];

  protected projetos: IProjetoView[] = [];

  protected formasContato: IFormaContato[] = [];

  protected categorias: ICategoria[] = [];

  protected clientes: IClienteView[] = [];
  protected clienteSelecionado: IClienteView | null = null;

  protected produtos: IProduto[] = [];

  protected historicoChamado: IHistoricoChamado[] = [];

  protected estrelas = [1, 2, 3, 4, 5];
  protected labels = ['Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'];
  protected notaSelecionada = 0;
  protected hover = 0;

  protected editandoId: string | null = null;
  protected textoEdicao: string = '';

  protected statusAlterado: boolean = false;

  protected preview = {
    aberto: false,
    src: '' as string,
    tipo: '' as 'image' | 'video' | 'audio' | 'pdf' | 'excel' | 'docx' | '',
    excel: null as null | {
      sheets: { name: string; rows: any[][] }[];
      activeIndex: number;
    }
  };

  protected zoomed = false;
  protected transformOrigin = '50% 50%';

  protected overlayAssumirRespAberto = false;
  private _resolverOverlay?: (decisao: boolean) => void;

  protected historicoChamadoAberto = false;

  protected obrigarAvaliacaoAberto = false;
  private _finalizacaoPendenteAposAvaliacao = false;

  private servicoPreSelecionadoEraComum = false;
  private originalServicoComumId: string | null = null;

  private tipoPreSelecionadoEraComum = false;
  private originalTipoServicoComumId: string | null = null;

  mostrarRelatorioPdf = false;

  private ignorarAutoUpdate = false;

  @ViewChild('relatorio') relatorioComp!: ChamadoRelatorioPrintComponent;

  private t?: any;

  private readonly PREVIEW_LIMITS = {
    image: 8 * 1024 * 1024,  // 8 MB
    pdf: 15 * 1024 * 1024, // 15 MB
    excel: 10 * 1024 * 1024, // 10 MB (além do limite por células)
    video: 25 * 1024 * 1024, // 25 MB
    audio: 10 * 1024 * 1024, // 10 MB
  };

  constructor(
    private chamadoService: ChamadoService,
    private mensagemChamadoService: MensagemChamadoService,
    private usuarioService: UsuarioService,
    private departamentoResponsavelService: DepartamentoResponsavelService,
    private servicoService: ServicoService,
    private blocoService: BlocoService,
    private notificacaoService: NotificacaoService,
    private whatsappService: WhatsappService,
    private mensagemService: MensagemService,
    private historicoChamadoService: HistoricoChamadoService,
    private projetoService: ProjetoService,
    private activatedRoute: ActivatedRoute,
    private fb: FormBuilder,
    private sanitizer: DomSanitizer,
    private location: Location,
    private uiBridge: UiBridgeService,
    private router: Router,
    private formaContatoService: FormaContatoService,
    private categoriaService: CategoriaService,
    private clienteService: ClienteService,
    private produtoService: ProdutoService,
    private draftDb: DraftAttachmentsDbService,
  ) { }

  private _waInFlight = new Map<string, number>();

  // dentro da classe DetalhesChamadoComponent
  get mesmaPessoa(): boolean {
    return Boolean(
      this.chamadoAtual &&
      typeof this.chamadoAtual.UsuarioCriacaoID === 'string' &&
      typeof this.chamadoAtual.UsuarioResponsavelID === 'string' &&
      this.chamadoAtual.UsuarioCriacaoID === this.chamadoAtual.UsuarioResponsavelID
    );
  }

  private sendWhatsAppOnce(
    key: string,
    obs$: import('rxjs').Observable<any>,
    dedupWindowMs = 30_000,
    label = 'whatsapp'
  ): void {
    const now = Date.now();
    const last = this._waInFlight.get(key) || 0;
    if (now - last < dedupWindowMs) {
      // já foi enviado recentemente — aborta
      console.info(`[${label}] pulando duplicado (key=${key})`);
      return;
    }

    // marca como "em voo"
    this._waInFlight.set(key, now);

    obs$
      .pipe(
        take(1),
        timeout(5000),
        catchError(err => {
          console.warn(`[${label}] falhou (ignorado):`, err);
          return of(null);
        })
      )
      .subscribe({
        next: () => {
          // sucesso: mantém timestamp (para segurar o dedup até expirar)
        },
        error: () => {
          // erro já tratado em catchError
        }
      });

    // limpa a chave após a janela (permite novo envio no futuro)
    setTimeout(() => this._waInFlight.delete(key), dedupWindowMs);
  }

  /**
   * Operação crítica (espera o resultado) com timeout único e swallow do erro.
   */
  private safeCritical<T>(
    obs$: import('rxjs').Observable<T>,
    label = 'critical'
  ): import('rxjs').Observable<T | null> {
    return obs$.pipe(
      take(1),
      timeout(8000),
      catchError(err => {
        console.error(`[${label}] erro:`, err);
        return of(null);
      })
    );
  }

  async ngOnInit(): Promise<void> {
    this.activatedRoute.paramMap
      .pipe(
        takeUntil(this.destroy$),
        // pega o id
        map((pm: ParamMap) => pm.get('ChamadoID') ?? ''),
        // ignora vazio
        filter(id => !!id),
        // evita recarregar se o id não mudar
        distinctUntilChanged()
      )
      .subscribe(id => {
        this.chamadoID = id;
        this.carregando = true;
        this.inicializarFormulario();
      });

    this.checarTelefoneObrigatorio();

    //this.habilitarAutoUpdate();

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  atualizarChamadoDebounced(): void {
    clearTimeout(this.t);
    this.t = setTimeout(() => this.atualizarChamado(), 1000);
  }

  private habilitarAutoUpdate(): void {
    this.formularioChamado.valueChanges
      .pipe(
        debounceTime(600), // ajuste: 400~1000ms
        filter(() => !this.ignorarAutoUpdate),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        // evita atualizar se form inválido, se quiser
        // if (this.formularioChamado.invalid) return;

        this.atualizarChamado();
      });
  }

  private checarTelefoneObrigatorio(): void {
    // pega do localStorage; se estiver criptografado, tenta decifrar; se não, usa cru
    const raw = localStorage.getItem('Telefone') || '';
    let tel = '';
    try {
      tel = CryptoJS.AES.decrypt(raw, environment.chavePrivada).toString(CryptoJS.enc.Utf8) || raw;
    } catch {
      tel = raw;
    }
    const digits = (tel || '').replace(/\D/g, '');
    if (digits === '17999999999') {
      this.showPhoneGuard = true; // abre o modal de aviso
    }
  }

  confirmarCadastroTelefone(): void {
    this.cancelarCadastroTelefone();
    this.uiBridge.openUserEditOverlay();
  }

  cancelarCadastroTelefone(): void {
    this.showPhoneGuard = false;
    // sai desta página e volta para onde estava
    this.location.back();
  }

  public irParaCadastroTelefone(): void {
    this.alertaTelefoneAberto = false;
    // TODO: troque a rota abaixo pela que você quiser
    this.router.navigate(['/MeuPerfil/AtualizarTelefone']);
  }

  public voltarPaginaAnterior(): void {
    this.alertaTelefoneAberto = false;
    this.location.back();
  }

  private async inicializarFormulario(): Promise<void> {
    this.arquivosSelecionados = [];
    this.servicos = [];
    this.servicosPorDepartamento = [];
    const isAdmin = this.perfilAcessoUsuario === 'Administrador' || this.perfilAcessoUsuario === 'SuperAdministrador';

    this.formularioChamado = this.fb.group({
      Titulo: ['', Validators.required],
      Prioridade: ['', Validators.required],
      UsuarioCriacaoID: [''],
      DepartamentoResponsavelID: [''],
      UsuarioResponsavelID: [''],
      BlocoID: [''],
      ServicoID: [''],
      TipoServicoID: [''],
      Status: ['', Validators.required],
      DataHoraFinalizacao: [''],
      UsuarioFinalizacaoID: [''],
      Mensagem: ['', [Validators.required, notOnlyWhitespaceValidator]],
      MensagemInterna: ['false'],
      AuxiliaresIDs: [[]],
      ProjetoID: [{ value: '', disabled: !isAdmin }],
      DataHoraInicioProjeto: [{ value: '', disabled: !isAdmin }],
      DataHoraEstimado: [{ value: '', disabled: !isAdmin }],
      DataHoraFinalizacaoProjeto: [{ value: '', disabled: !isAdmin }],
      FormaContatoID: [''],
      CategoriaID: [''],
      ClienteID: ['', Validators.required],
      Produto: ['', Validators.required],
      Lote: [''],
      Fabricacao: [''],
      Validade: [''],
      HoraEnvase: [''],
      Quantidade: [0],
      LocalCompra: [''],
      EstadoProduto: [''],
    });

    this.formularioChamado.get('DepartamentoResponsavelID')?.disable({ emitEvent: false });

    try {
      this.chamadoID = this.activatedRoute.snapshot.paramMap.get('ChamadoID') || '';
      this.chamadoAtual = await this.chamadoService.buscarChamado(this.chamadoID).toPromise() || {} as IChamadoView;

      if (!(this.chamadoAtual as any)?.ClienteID) {
        this.mensagemService.adicionarMensagem('Este chamado não é SAC.');
        this.router.navigate(['/Chamados/TodosSac']); // ajuste rota
        return;
      }

      this.notificacaoService.marcarNotificacoesUsuarioChamadoComoLidas(this.usuarioID, this.chamadoID).subscribe({
        next: () => { },
        error: (error) => console.error('Erro ao marcar notificações como lidas:', error)
      });

      this.chamadoAtual.Mensagens = this.ordenarMensagensNosChamados(this.chamadoAtual);

      const usuarios = await this.usuarioService.buscarUsuarios().toPromise() || [];
      this.usuarios = usuarios.filter(usuario => usuario.Ativo);
      this.usuarios = usuarios
        .filter(usuario => usuario.Ativo)
        .sort((a, b) => a.Nome.localeCompare(b.Nome));
      this.usuariosTecnicos = usuarios.filter(usuario => (usuario.PerfilAcesso === 'Tecnico' || usuario.PerfilAcesso === 'Administrador' || usuario.PerfilAcesso === 'SuperAdministrador') && usuario.Ativo);

      this.departamentosResponsaveis = await this.departamentoResponsavelService.buscarDepartamentosResponsaveis().toPromise() || [];

      this.servicos = await this.servicoService.buscarServicos().toPromise() || [];

      this.formasContato = await this.formaContatoService.buscarFormasContato().toPromise() || [];
      this.categorias = await this.categoriaService.buscarCategorias().toPromise() || [];
      this.clientes = await this.clienteService.buscarClientes().toPromise() || [];
      this.produtos = (await this.produtoService.buscarProdutos().toPromise() || [])
        .slice()
        .sort((a, b) => a.ProdutoDescricao.localeCompare(b.ProdutoDescricao, 'pt-BR'));


      this.clienteSelecionado = this.clientes.find(c => c.ClienteID === (this.chamadoAtual as any).ClienteID) || null;

      const depId =
        this.formularioChamado.get('DepartamentoResponsavelID')?.value
        || this.chamadoAtual.DepartamentoResponsavelID; // fallback, se precisar

      this.servicosPorDepartamento = this.servicos
        .filter(s => s.DepartamentoResponsavelID === depId)
        .slice() // opcional: evita mutar o array original ao ordenar
        .sort((a, b) => a.Servico.localeCompare(b.Servico));

      this.usuariosTecnicosPorDepartamento = this.usuariosTecnicos
        .filter(usuario => usuario.DepartamentoResponsavelID === this.chamadoAtual.DepartamentoResponsavelID)
        .sort((a, b) => a.Nome.localeCompare(b.Nome));

      this.blocos = (await this.blocoService.buscarBlocos().toPromise() || [])
        .sort((a, b) => {
          const letraA = a.Bloco.match(/^Bloco\s+([A-Z])/i)?.[1] || '';
          const letraB = b.Bloco.match(/^Bloco\s+([A-Z])/i)?.[1] || '';
          return letraA.localeCompare(letraB);
        });

      this.projetos = await this.projetoService.buscarProjetos().toPromise() || []

      if (this.chamadoAtual.Status === 'Finalizado' || this.chamadoAtual.Status === 'Cancelado') {
        this.desabilitarCamposFormulario();

        this.nomeUsuarioFinalizacao = this.usuarios.find(usuario => usuario.UsuarioID === this.chamadoAtual.UsuarioFinalizacaoID)?.Nome || '';
      }

      this.ignorarAutoUpdate = true;
      this.formularioChamado.patchValue({
        Titulo: this.chamadoAtual.Titulo,
        Prioridade: this.chamadoAtual.Prioridade,
        BlocoID: this.chamadoAtual.BlocoID,
        UsuarioCriacaoID: this.chamadoAtual.UsuarioCriacaoID,
        DepartamentoResponsavelID: this.chamadoAtual.DepartamentoResponsavelID,
        UsuarioResponsavelID: this.chamadoAtual.UsuarioResponsavelID,
        ServicoID: this.chamadoAtual.ServicoID,
        TipoServicoID: this.chamadoAtual.TipoServicoID,
        Status: this.chamadoAtual.Status,
        DataHoraFinalizacao: this.chamadoAtual.DataHoraFinalizacao === '0001-01-01T00:00:00' ? null : this.chamadoAtual.DataHoraFinalizacao,
        AuxiliaresIDs: this.chamadoAtual.UsuariosAuxiliares.map(auxiliar => auxiliar.UsuarioID) || [],
        ProjetoID: this.chamadoAtual.ProjetoID,
        DataHoraInicioProjeto: this.chamadoAtual.DataHoraInicioProjeto,
        DataHoraEstimado: this.chamadoAtual.DataHoraEstimado,
        DataHoraFinalizacaoProjeto: this.chamadoAtual.DataHoraFinalizacaoProjeto,
        FormaContatoID: (this.chamadoAtual as any).FormaContatoID,
        CategoriaID: (this.chamadoAtual as any).CategoriaID,
        ClienteID: (this.chamadoAtual as any).ClienteID,
        Produto: (this.chamadoAtual as any).Produto,
        Lote: (this.chamadoAtual as any).LoteProduto || (this.chamadoAtual as any).Lote,
        Fabricacao: this.toDateOnly((this.chamadoAtual as any).Fabricacao),
        Validade: this.toDateOnly((this.chamadoAtual as any).Validade),
        HoraEnvase: (this.chamadoAtual as any).HoraEnvase,
        Quantidade: (this.chamadoAtual as any).QuantidadeProduto || 0,
        LocalCompra: (this.chamadoAtual as any).LocalCompra,
        EstadoProduto: (this.chamadoAtual as any).Estado,
      }, { emitEvent: false });

      this.ignorarAutoUpdate = false;

      this.aplicarBloqueioDatasSAC();

      const servSel = this.formularioChamado.get('ServicoID')?.value || this.chamadoAtual.ServicoID || '';
      const tipoSel = this.formularioChamado.get('TipoServicoID')?.value || this.chamadoAtual.TipoServicoID || '';

      const servicoInicial = this.servicos.find(s => s.ServicoID === servSel);
      const tipoInicial = this.servicos
        .find(s => s.ServicoID === servSel)?.TipoServico.find(t => t.TipoServicoID === tipoSel);

      // --- Serviço: se era “Comum”, guarda e limpa o controle (fica “vazio” visualmente)
      this.servicoPreSelecionadoEraComum = !!(servicoInicial && this.isNomeComum(servicoInicial.Servico));
      this.originalServicoComumId = this.servicoPreSelecionadoEraComum ? servSel : null;
      if (this.servicoPreSelecionadoEraComum) {
        this.formularioChamado.get('ServicoID')?.setValue('', { emitEvent: false });
      }

      // --- Tipo: se era “Comum”, guarda e limpa o controle (fica “vazio”)
      this.tipoPreSelecionadoEraComum = !!(tipoInicial && this.isNomeComum(tipoInicial.TipoServico));
      this.originalTipoServicoComumId = this.tipoPreSelecionadoEraComum ? tipoSel : null;
      if (this.tipoPreSelecionadoEraComum) {
        this.formularioChamado.get('TipoServicoID')?.setValue('', { emitEvent: false });
      }

      // Monta listas SEM “Comum” (não re-inclui nada)
      this.servicosPorDepartamento = this.montarServicosDoDep(depId);
      this.tiposServico = this.montarTiposDoServico(
        // se limpamos o serviço, não conseguimos listar tipos; só monta se houver serviço válido
        this.formularioChamado.get('ServicoID')?.value || (!this.servicoPreSelecionadoEraComum ? servSel : null)
      );
      if (this.perfilAcessoUsuario === 'Usuário') {
        this.formularioChamado.get('UsuarioCriacaoID')?.disable();
        this.formularioChamado.get('DepartamentoResponsavelID')?.disable();
        this.formularioChamado.get('UsuarioResponsavelID')?.disable();
      }

      this.nomeUsuarioCriacao = this.usuarios.find(usuario => usuario.UsuarioID === this.chamadoAtual.UsuarioCriacaoID)?.Nome || '';

      this.historicoChamado = [];
      this.historicoChamado =
        (await this.historicoChamadoService.buscarHistoricoChamado(this.chamadoID).toPromise() || [])
          .sort((a, b) => new Date(b.DataHora).getTime() - new Date(a.DataHora).getTime());
    }
    catch (error) {
      console.error('Erro ao inicializar detalhes do chamado:', error);
    }
    finally {
      this.carregando = false;
    }
  }

  private desabilitarCamposFormulario(): void {
    Object.keys(this.formularioChamado.controls).forEach(campo => {
      if (campo !== 'Status') {
        this.formularioChamado.get(campo)?.disable({ emitEvent: false });
      }
    });

    this.formularioChamado.get('DataHoraInicioProjeto')?.disable({ emitEvent: false });
    this.formularioChamado.get('DataHoraEstimado')?.disable({ emitEvent: false });
    this.formularioChamado.get('DataHoraFinalizacaoProjeto')?.disable({ emitEvent: false });

    this.formularioChamado.get('Fabricacao')?.disable({ emitEvent: false });
    this.formularioChamado.get('Validade')?.disable({ emitEvent: false });
  }


  // abre overlay e "pausa" até decidir
  private perguntarSeQuerAssumir(): Promise<boolean> {
    this.overlayAssumirRespAberto = true;
    return new Promise<boolean>(resolve => {
      this._resolverOverlay = resolve;
    });
  }

  // botões do overlay
  protected confirmarAssumir(): void {
    this.overlayAssumirRespAberto = false;
    this._resolverOverlay?.(true);
    this._resolverOverlay = undefined;
  }

  protected cancelarAssumir(): void {
    this.overlayAssumirRespAberto = false;
    this._resolverOverlay?.(false);
    this._resolverOverlay = undefined;
  }

  protected async adicionarMensagem(): Promise<void> {
    const msgCtrl = this.formularioChamado.get('Mensagem');
    if (!msgCtrl?.valid) return;

    this.carregando = true;

    try {
      // --- 0) Quem é o responsável atual?
      const respForm = this.formularioChamado.get('UsuarioResponsavelID')?.value || null;
      const respAtual = respForm ?? this.chamadoAtual.UsuarioResponsavelID ?? null;
      const ehResponsavel = respAtual === this.usuarioID;

      // --- 1) Se não sou responsável e não sou “Usuário”, oferecer assumir antes
      /*if (!ehResponsavel && this.perfilAcessoUsuario !== 'Usuário') {
        this.carregando = false; // libera UI pro overlay
        const querAssumir = await this.perguntarSeQuerAssumir();
        this.carregando = true;

        if (querAssumir) {
          this.formularioChamado.patchValue({ UsuarioResponsavelID: this.usuarioID });
          await this.atualizarChamado(); // apenas atualização do chamado (sem Mensagens)
          this.carregando = true;
        }
      }*/

      // --- 2) Vamos descobrir se houve mudança de status
      const houveMudancaDeStatus =
        (this.formularioChamado.get('Status')?.value as string) !== this.chamadoAtual.Status;
      const novoStatus = this.formularioChamado.get('Status')?.value as string;

      // --- 3) Enviar a MENSAGEM primeiro (principal correção)
      const textoOriginal: string = msgCtrl.value || '';
      const textoComCRLF = textoOriginal.replace(/\r?\n/g, '\r\n');

      const mensagem: IMensagem = {
        UsuarioID: this.usuarioID,
        Mensagem: textoComCRLF,
        DataHoraInicio: this.dataHoraInicio,
        DataHoraFim: this.getLocalISODateString(new Date()),
        Arquivos: (this.arquivosSelecionados ?? []).map(a => ({
          LinkArquivo: a.base64,
          NomeArquivo: a.nome,
          TipoMime: a.tipo
        })),
        Interno: this.formularioChamado.get('MensagemInterna')?.value === 'true'
      };

      await firstValueFrom(
        this.mensagemChamadoService.criarMensagemPorChamado(this.chamadoID, mensagem)
      );

      // --- 4) Notificações & WhatsApp (best effort) da NOVA mensagem
      const criadorID = this.chamadoAtual.UsuarioCriacaoID || null;
      const responsavelID =
        (this.formularioChamado.get('UsuarioResponsavelID')?.value || this.chamadoAtual.UsuarioResponsavelID) || null;

      // 🔹 NOVO: coletar auxiliares (form -> fallback para o chamado atual)
      const auxiliaresIDsForm: string[] = this.formularioChamado.get('AuxiliaresIDs')?.value || [];
      const auxiliaresIDsChamado: string[] = (this.chamadoAtual.UsuariosAuxiliares || []).map(a => a.UsuarioID);
      const auxiliaresIDs: string[] = (auxiliaresIDsForm.length ? auxiliaresIDsForm : auxiliaresIDsChamado) || [];

      // 🔹 junta criador, responsável e auxiliares (sem duplicar, sem você mesmo)
      const destinatarios = Array.from(
        new Set(
          [criadorID, responsavelID, ...auxiliaresIDs]
            .filter((id): id is string => !!id && id !== this.usuarioID)
        )
      );

      // Notificações internas (críticas) para todos os destinatários
      const notificacoesCriticas = destinatarios.map(destId =>
        this.safeCritical(
          this.notificacaoService.criarNotificacao({
            Mensagem: 'Nova mensagem adicionada ao chamado!',
            UsuarioID: destId,
            UrlDestino: this.detalhesUrl,
            ChamadoID: this.chamadoID
          }),
          'notificacao nova mensagem'
        )
      );

      // WhatsApp (mesmo template para auxiliares)
      for (const destId of destinatarios) {
        const dest = this.usuarios.find(u => u.UsuarioID === destId);
        if (dest?.Telefone) {
          const key = `nova-mensagem:${dest.Telefone}:${this.chamadoID}`;
          this.sendWhatsAppOnce(
            key,
            this.whatsappService.enviarMensagemWhatsApp({
              Nome: dest.Nome,
              Telefone: dest.Telefone,
              TemplateId: '2575168142846848', // mesmo template já utilizado
              BodyParameters: [
                dest.Nome,
                this.chamadoAtual.Titulo,
                this.detalhesLinkPublico
              ]
            }),
            30000,
            'whatsapp nova mensagem'
          );
        }
      }

      if (notificacoesCriticas.length) {
        await firstValueFrom(forkJoin(notificacoesCriticas));
      }

      // --- 5) Só agora, se houve mudança, alterar o STATUS
      if (houveMudancaDeStatus) {
        await this.alterarStatusChamado();
        this.statusAlterado = false;
      }

      // --- 6) Atualiza a tela (sem dar reload imediato)
      await this.inicializarFormulario();

      // --- 7) Se finalizado/cancelado, pode recarregar no final (opcional)
      if (['Finalizado', 'Cancelado'].includes(novoStatus)) {
        location.reload();
        return;
      }
    } catch (error) {
      console.error('Erro ao adicionar mensagem:', error);
    } finally {
      this.carregando = false;
    }
  }

  protected async alterarStatusChamado(): Promise<void> {
    // IMPORTANTE: nada de this.carregando aqui; quem chama controla o loading.

    if (this.formularioChamado.get('Status')?.value === 'Finalizado' || this.formularioChamado.get('Status')?.value === 'Cancelado') {
      this.formularioChamado.patchValue({
        DataHoraFinalizacao: this.getLocalISODateString(new Date()),
        UsuarioFinalizacaoID: this.usuarioID,
      });

      if (this.chamadoAtual.ProjetoID !== null) {
        this.formularioChamado.patchValue({
          DataHoraFinalizacaoProjeto: this.getLocalISODateString(new Date())
        });
      }
    }

    await firstValueFrom(
      this.chamadoService.atualizarChamado(this.chamadoID, this.obterChamadoParaAtualizacao())
    );

    const statusFormatado = this.formularioChamado.get('Status')?.value as string;
    const criadorID = this.chamadoAtual.UsuarioCriacaoID || null;
    const responsavelID = this.chamadoAtual.UsuarioResponsavelID || null;

    // 🔹 NOVO: capturar auxiliares do form; se vazio, usar os do chamado atual
    const auxiliaresIDsForm: string[] = this.formularioChamado.get('AuxiliaresIDs')?.value || [];
    const auxiliaresIDsChamado: string[] = (this.chamadoAtual.UsuariosAuxiliares || []).map(a => a.UsuarioID);
    const auxiliaresIDs: string[] = (auxiliaresIDsForm.length ? auxiliaresIDsForm : auxiliaresIDsChamado) || [];

    // 🔹 Junta criador + responsável + auxiliares (sem duplicar e sem incluir o usuário atual)
    const destinatarios = Array.from(
      new Set(
        [criadorID, responsavelID, ...auxiliaresIDs]
          .filter((id): id is string => !!id && id !== this.usuarioID)
      )
    );

    // Notificações internas (críticas) para todos
    const notificacoesCriticas = destinatarios.map(destId =>
      this.safeCritical(
        this.notificacaoService.criarNotificacao({
          Mensagem: `Chamado ${String(statusFormatado).toLowerCase()}!`,
          UsuarioID: destId,
          UrlDestino: this.detalhesUrl,
          ChamadoID: this.chamadoID
        }),
        'notificacao status'
      )
    );

    // WhatsApp -> best effort (MESMO template já usado)
    for (const destId of destinatarios) {
      const dest = this.usuarios.find(u => u.UsuarioID === destId);
      if (dest?.Telefone) {
        const key = `status:${dest.Telefone}:${this.chamadoID}:${statusFormatado}`;
        this.sendWhatsAppOnce(
          key,
          this.whatsappService.enviarMensagemWhatsApp({
            Nome: dest.Nome,
            Telefone: dest.Telefone,
            TemplateId: '1145396200474687', // mantém o mesmo template
            BodyParameters: [
              dest.Nome,
              this.chamadoAtual.Titulo,
              statusFormatado,
              this.detalhesLinkPublico
            ]
          }),
          30000,
          'whatsapp status'
        );
      }
    }

    if (notificacoesCriticas.length) {
      await firstValueFrom(forkJoin(notificacoesCriticas));
    }
  }

  // Essa é uma função auxiliar para evitar duplicação de código
  private obterChamadoParaAtualizacao(): IChamadoForm {
    const f = this.formularioChamado;

    const mensagem: IMensagem = {
      UsuarioID: this.usuarioID,
      Mensagem: f.get('Mensagem')?.value,
      DataHoraInicio: this.dataHoraInicio,
      DataHoraFim: this.getLocalISODateString(new Date()),
      Arquivos: this.arquivosSelecionados?.map(a => ({ LinkArquivo: a.base64, NomeArquivo: a.nome, TipoMime: a.tipo })) ?? [],
      Interno: f.get('MensagemInterna')?.value == 'true'
    };

    // monta objeto base
    const base: IChamadoForm = {
      Titulo: f.get('Titulo')?.value,
      Prioridade: f.get('Prioridade')?.value,
      UsuarioCriacaoID: f.get('UsuarioCriacaoID')?.value,
      DepartamentoResponsavelID: f.get('DepartamentoResponsavelID')?.value,
      UsuarioResponsavelID: f.get('UsuarioResponsavelID')?.value || null,
      BlocoID: f.get('BlocoID')?.value || null,
      ServicoID: f.get('ServicoID')?.value || null,
      TipoServicoID: f.get('TipoServicoID')?.value || null,

      DataHora: this.chamadoAtual.DataHora,

      DataHoraFinalizacao: this.normalizeSqlDate(f.get('DataHoraFinalizacao')?.value),
      UsuarioFinalizacaoID: f.get('UsuarioFinalizacaoID')?.value || null,
      Status: f.get('Status')?.value,
      Mensagens: mensagem,
      UsuarioRealizacaoID: this.usuarioID,

      ProjetoID: f.get('ProjetoID')?.value || null,
      DataHoraInicioProjeto: this.normalizeSqlDate(f.get('DataHoraInicioProjeto')?.value),
      DataHoraFinalizacaoProjeto: this.normalizeSqlDate(f.get('DataHoraFinalizacaoProjeto')?.value),
      DataHoraEstimado: this.normalizeSqlDate(f.get('DataHoraEstimado')?.value),

      FormaContatoID: this.formularioChamado.get('FormaContatoID')?.value || null,
      CategoriaID: this.formularioChamado.get('CategoriaID')?.value || null,
      ClienteID: this.formularioChamado.get('ClienteID')?.value,
      Produto: this.formularioChamado.get('Produto')?.value,
      LoteProduto: this.formularioChamado.get('Lote')?.value || null,
      Fabricacao: this.formularioChamado.get('Fabricacao')?.value || null,
      Validade: this.formularioChamado.get('Validade')?.value || null,
      HoraEnvase: this.formularioChamado.get('HoraEnvase')?.value
        ? (String(this.formularioChamado.get('HoraEnvase')?.value).length === 5
          ? `${this.formularioChamado.get('HoraEnvase')?.value}:00`
          : this.formularioChamado.get('HoraEnvase')?.value)
        : null,
      QuantidadeProduto: this.formularioChamado.get('Quantidade')?.value || null,
      LocalCompra: this.formularioChamado.get('LocalCompra')?.value || null,
      Estado: this.formularioChamado.get('EstadoProduto')?.value || null
    };

    // 🔹 anexa UsuariosAuxiliares apenas se houver algo para enviar (evita apagar no backend)
    const auxiliares = this.resolverAuxiliaresParaEnvio();
    if (auxiliares) {
      // @ts-ignore — caso a interface tenha o campo opcional
      base.UsuariosAuxiliares = auxiliares;
    }

    return base;
  }

  // 1) NOVO helper: resolve corretamente os auxiliares para envio
  private resolverAuxiliaresParaEnvio(): { UsuarioID: string }[] | undefined {
    // Tenta ler do form (preferencialmente)
    const idsForm: string[] | undefined = this.formularioChamado.get('AuxiliaresIDs')?.value;

    if (Array.isArray(idsForm) && idsForm.length > 0) {
      // dedup
      const uniq = Array.from(new Set(idsForm.filter(Boolean)));
      if (uniq.length > 0) {
        return uniq.map(id => ({ UsuarioID: id }));
      }
      // se cair aqui, tratamos abaixo o fallback
    }

    // Fallback: usa o que já está no chamado (preserva)
    const atuais = this.chamadoAtual?.UsuariosAuxiliares || [];
    if (atuais.length > 0) {
      return atuais.map(a => ({ UsuarioID: a.UsuarioID }));
    }

    // IMPORTANTE: undefined => NÃO enviar o campo no body (não apaga no backend)
    return undefined;
  }

  protected atualizarChamado(): void {
    this.carregando = true;

    let mensagem: IMensagem = {
      UsuarioID: this.usuarioID,
      Mensagem: this.formularioChamado.get('Mensagem')?.value,
      DataHoraInicio: this.dataHoraInicio,
      DataHoraFim: new Date().toISOString(),
      Arquivos: this.arquivosSelecionados ? this.arquivosSelecionados.map(arquivo => ({
        LinkArquivo: arquivo.base64,
        NomeArquivo: arquivo.nome,
        TipoMime: arquivo.tipo
      })) : [],
      Interno: this.formularioChamado.get('MensagemInterna')?.value == 'true' ? true : false
    };

    const chamado: IChamadoForm = {
      Titulo: this.formularioChamado.get('Titulo')?.value,
      Prioridade: this.formularioChamado.get('Prioridade')?.value,
      UsuarioCriacaoID: this.formularioChamado.get('UsuarioCriacaoID')?.value,
      DepartamentoResponsavelID: this.formularioChamado.get('DepartamentoResponsavelID')?.value,
      UsuarioResponsavelID: this.formularioChamado.get('UsuarioResponsavelID')?.value != '' ? this.formularioChamado.get('UsuarioResponsavelID')?.value : null,
      BlocoID: this.formularioChamado.get('BlocoID')?.value == '' ? null : this.formularioChamado.get('BlocoID')?.value,
      ServicoID: this.formularioChamado.get('ServicoID')?.value == '' ? null : this.formularioChamado.get('ServicoID')?.value,
      TipoServicoID: this.formularioChamado.get('TipoServicoID')?.value == '' ? null : this.formularioChamado.get('TipoServicoID')?.value,
      DataHora: this.chamadoAtual.DataHora,
      DataHoraFinalizacao: this.normalizeSqlDate(this.formularioChamado.get('DataHoraFinalizacao')?.value),
      UsuarioFinalizacaoID: this.formularioChamado.get('UsuarioFinalizacaoID')?.value || null,
      Status: this.formularioChamado.get('Status')?.value,
      Mensagens: mensagem,
      UsuariosAuxiliares: (this.formularioChamado.get('AuxiliaresIDs')?.value || []).map((id: string) => ({ UsuarioID: id })),
      UsuarioRealizacaoID: this.usuarioID,
      ProjetoID: this.formularioChamado.get('ProjetoID')?.value == '' ? null : this.formularioChamado.get('ProjetoID')?.value,
      DataHoraInicioProjeto: this.normalizeSqlDate(this.formularioChamado.get('DataHoraInicioProjeto')?.value),
      DataHoraFinalizacaoProjeto: this.normalizeSqlDate(this.formularioChamado.get('DataHoraFinalizacaoProjeto')?.value),
      DataHoraEstimado: this.normalizeSqlDate(this.formularioChamado.get('DataHoraEstimado')?.value),
      // ===== SAC =====
      FormaContatoID: this.formularioChamado.get('FormaContatoID')?.value || null,
      CategoriaID: this.formularioChamado.get('CategoriaID')?.value || null,
      ClienteID: this.formularioChamado.get('ClienteID')?.value,
      Produto: this.formularioChamado.get('Produto')?.value,
      LoteProduto: this.formularioChamado.get('Lote')?.value || null,
      Fabricacao: this.formularioChamado.get('Fabricacao')?.value || null,
      Validade: this.formularioChamado.get('Validade')?.value || null,
      HoraEnvase: this.formularioChamado.get('HoraEnvase')?.value
        ? (String(this.formularioChamado.get('HoraEnvase')?.value).length === 5
          ? `${this.formularioChamado.get('HoraEnvase')?.value}:00`
          : this.formularioChamado.get('HoraEnvase')?.value)
        : null,
    }

    this.chamadoService.atualizarChamado(this.chamadoID, chamado).subscribe({
      next: () => {
        //location.reload();
        this.carregando = false;
      },
      error: (error) => {
        console.error('Erro ao atualizar chamado:', error);
        this.carregando = false;
      }
    });
  }

  /** Converte '', null, undefined e '0001-01-01T00:00:00' em null.
 * Protege também datas inválidas.
 */
  private normalizeSqlDate(v: string | null | undefined): string | null {
    if (!v) return null;
    if (v === '0001-01-01T00:00:00') return null;
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return v;
  }


  protected reabrirChamado(): void {
    this.carregando = true;

    this.notificacaoService.criarNotificacao({
      Mensagem: `Chamado reaberto!`,
      UsuarioID: this.usuarioID == this.chamadoAtual.UsuarioResponsavelID ? this.chamadoAtual.UsuarioCriacaoID : this.chamadoAtual.UsuarioResponsavelID,
      UrlDestino: this.detalhesUrl,
      ChamadoID: this.chamadoID
    }).subscribe({
      next: () => { },
      error: err => console.error('Erro ao criar notificação:', err)
    });

    this.chamadoService.reabrirChamado(this.chamadoID).subscribe({
      next: () => {
        location.reload();
      },
      error: (error) => {
        console.error('Erro ao reabrir chamado:', error);
        this.carregando = false;
      }
    });
  }

  protected ordenarMensagensNosChamados(chamados: IChamadoView): IMensagemView[] {
    const mensagensOrdenadas = chamados.Mensagens.sort((a, b) => {
      const dataA = new Date(a.DataHoraFim).getTime();
      const dataB = new Date(b.DataHoraFim).getTime();
      return dataB - dataA; // ordem decrescente
    });

    return mensagensOrdenadas.map(mensagem => ({
      ...mensagem,
      ChamadoID: chamados.ChamadoID
    }));
  }

  protected formatarDataHora(isoString: string): string {
    const data = new Date(isoString);

    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0'); // Mês começa em 0
    const ano = data.getFullYear();

    const horas = String(data.getHours()).padStart(2, '0');
    const minutos = String(data.getMinutes()).padStart(2, '0');

    return `${dia}/${mes}/${ano} - ${horas}:${minutos}`;
  }

  protected buscarUsuarioMensagem(usuarioID: string): IUsuarioView {
    const usuario = this.usuarios.find(u => u.UsuarioID === usuarioID);
    return usuario || {} as IUsuarioView;
  }

  onFileSelected(event: any): void {
    const list: FileList = event.target.files;
    const files: File[] = [];
    for (let i = 0; i < list.length; i++) files.push(list.item(i)!);
    this.processFiles(files);
    event.target.value = '';
  }

  removerArquivo(index: number): void {
    this.arquivosSelecionados.splice(index, 1);
  }

  isImage(tipo: string): boolean {
    return tipo.startsWith('image/');
  }

  isImageView(url: string): boolean {
    return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url);
  }

  getNomeArquivo(link: string): string {
    const partes = link.split('/');
    return decodeURIComponent(partes[partes.length - 1]);
  }

  private getLocalISODateString(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  protected atribuirChamadoEmAtendimento(): void {
    this.formularioChamado.patchValue({ Status: 'Em atendimento' });

    if (this.chamadoAtual) this.chamadoAtual.Status = 'Em atendimento';

    this.alterarStatusChamado();
  }

  protected atribuirChamadoUsuario(): void {
    this.formularioChamado.patchValue({
      UsuarioResponsavelID: this.usuarioID
    });

    this.atualizarChamado();
  }

  protected alterarSolicitanteChamado(): void {
    this.atualizarChamado();

    if (this.usuarioID !== this.formularioChamado.get('UsuarioCriacaoID')?.value) {
      this.notificacaoService.criarNotificacao({
        Mensagem: `Você foi atribuído como solicitante de um chamado!`,
        UsuarioID: this.formularioChamado.get('UsuarioCriacaoID')?.value,
        UrlDestino: this.detalhesUrl,
        ChamadoID: this.chamadoID
      }).subscribe({
        next: () => { },
        error: err => console.error('Erro ao criar notificação:', err)
      });

      const destinatario = this.usuarios.find(u => u.UsuarioID === this.formularioChamado.get('UsuarioCriacaoID')?.value) || { Nome: 'Usuário', Telefone: '' };

      const mensagemWhatsapp: IWhatsappEnvio = {
        Nome: destinatario.Nome,
        Telefone: destinatario.Telefone,
        TemplateId: '1077609287789930', // Substitua pelo template correto
        BodyParameters: [
          destinatario.Nome,
          'Solicitante',
          this.chamadoAtual.Titulo,
          this.detalhesLinkPublico
        ]
      };

      // WhatsApp -> best effort
      const key = `atribuir-solicitante:${destinatario.Telefone}:${this.chamadoID}`;
      this.sendWhatsAppOnce(
        key,
        this.whatsappService.enviarMensagemWhatsApp(mensagemWhatsapp),
        30000,
        'whatsapp atribuir solicitante'
      );

    }
  }

  protected alterarResponsavelChamado(): void {
    this.atualizarChamado();

    if (this.usuarioID !== this.formularioChamado.get('UsuarioResponsavelID')?.value) {
      this.notificacaoService.criarNotificacao({
        Mensagem: `Você foi atribuído como responsável de um chamado!`,
        UsuarioID: this.formularioChamado.get('UsuarioResponsavelID')?.value,
        UrlDestino: this.detalhesUrl,
        ChamadoID: this.chamadoID
      }).subscribe({
        next: () => { },
        error: err => console.error('Erro ao criar notificação:', err)
      });

      const destinatario = this.usuarios.find(u => u.UsuarioID === this.formularioChamado.get('UsuarioResponsavelID')?.value) || { Nome: 'Usuário', Telefone: '' };

      const mensagemWhatsapp: IWhatsappEnvio = {
        Nome: destinatario.Nome,
        Telefone: destinatario.Telefone,
        TemplateId: '1077609287789930', // Substitua pelo template correto
        BodyParameters: [
          destinatario.Nome,
          'Responsável',
          this.chamadoAtual.Titulo,
          this.detalhesLinkPublico
        ]
      };

      // WhatsApp -> best effort
      const key = `atribuir-responsavel:${destinatario.Telefone}:${this.chamadoID}`;
      this.sendWhatsAppOnce(
        key,
        this.whatsappService.enviarMensagemWhatsApp(mensagemWhatsapp),
        30000,
        'whatsapp atribuir responsavel'
      );

    }
  }

  protected async selecionarEstrela(nota: number) {
    this.carregando = true;

    if (this.mesmaPessoa) {
      // Se for a mesma pessoa (solicitante ou responsável por si mesmo), não envia a mensagem
      this.carregando = false;
      return;
    }

    try {
      // 1) Enviar mensagem de WhatsApp para o responsável
      const responsavel = this.usuarios.find(u => u.UsuarioID === this.chamadoAtual.UsuarioResponsavelID);
      if (responsavel && responsavel.Telefone) {
        const mensagemWhatsapp: IWhatsappEnvio = {
          Nome: responsavel.Nome,
          Telefone: responsavel.Telefone,
          TemplateId: '1328854439249682', // substitua pelo template correto
          BodyParameters: [
            responsavel.Nome,
            this.chamadoAtual.Titulo,
            this.labels[nota - 1],
            this.detalhesLinkPublico
          ]
        };

        // Envia a mensagem do WhatsApp com deduplicação
        const key = `avaliacao:${responsavel.Telefone}:${this.chamadoID}:${this.labels[nota - 1]}`;
        await this.sendWhatsAppOnce(
          key,
          this.whatsappService.enviarMensagemWhatsApp(mensagemWhatsapp),
          30000, // Timeout de 30 segundos
          'whatsapp avaliacao'
        );
      }

      // 2) Criar a notificação para o responsável
      if (this.chamadoAtual.UsuarioResponsavelID) {
        await this.notificacaoService.criarNotificacao({
          Mensagem: `Seu atendimento foi avaliado como ${this.labels[nota - 1]} nesse chamado!`,
          UsuarioID: this.chamadoAtual.UsuarioResponsavelID,
          UrlDestino: this.detalhesUrl,
          ChamadoID: this.chamadoID
        }).toPromise();  // Aguarda o envio da notificação
      }

      // 3) Responder a pesquisa de satisfação (atualiza a pesquisa)
      await this.chamadoService.responderPesquisaSatisfacao(this.chamadoID, this.labels[nota - 1]).toPromise();

      // 4) Verifica se a avaliação foi obrigatória (por ser uma finalização)
      /*if (this.obrigarAvaliacaoAberto) {
        // Se a avaliação foi forçada, sinaliza que já foi preenchida
        this.obrigarAvaliacaoAberto = false;
        this.chamadoAtual.PesquisaSatisfacao = this.labels[nota - 1];

        // Sinaliza que o fluxo pós-avaliação pode prosseguir
        this._finalizacaoPendenteAposAvaliacao = true;

        // 5) Agora efetiva a finalização do chamado
        await this.alterarStatusChamado(); // Alteração de status (finalização)

        // 6) Recarrega os dados ou envia a mensagem adicional se necessário
        await this.inicializarFormulario();  // Pode recarregar a tela ou continuar com fluxo

        // Retorna sem o reload padrão, pois já está tudo atualizado
        return;
      }*/

      // 7) Caso o fluxo tenha sido espontâneo, faz o reload normal
      location.reload();
    } catch (error) {
      console.error('Erro ao processar a avaliação:', error);
    } finally {
      this.carregando = false;
    }
  }

  protected hoverEstrela(posicao: number) {
    this.hover = posicao;
  }

  protected getClasseEstrela(posicao: number): string {
    const nota = this.hover || this.notaSelecionada;
    return posicao <= nota ? `ativa-${posicao}` : '';
  }

  private notaPorLabel: Record<string, number> = {
    'Péssimo': 1,
    'Ruim': 2,
    'Regular': 3,
    'Bom': 4,
    'Excelente': 5,
  };

  getSatisfacaoClasse(): string | string[] {
    const label = this.chamadoAtual?.PesquisaSatisfacao || '';
    const nota = this.notaPorLabel[label] || 0;
    // retorna classes para o [ngClass]
    return ['star-avaliacao', nota ? `ativa-${nota}` : ''];
  }


  protected iniciarEdicao(item: IMensagemView): void {
    // Garante no client que só o autor entra em edição
    if (item.UsuarioID !== this.usuarioID) return;
    // Também bloqueia se o chamado estiver encerrado
    if (this.chamadoAtual.Status === 'Finalizado' || this.chamadoAtual.Status === 'Cancelado') return;

    this.editandoId = item.MensagemID;        // precisa existir em IMensagemView
    this.textoEdicao = item.Mensagem;
  }

  protected cancelarEdicao(): void {
    this.editandoId = null;
    this.textoEdicao = '';
  }

  protected async salvarEdicao(item: IMensagemView): Promise<void> {
    if (item.UsuarioID !== this.usuarioID) return;
    if (!this.editandoId) return;

    const texto = (this.textoEdicao || '').trim();
    if (!texto) return;

    // Converte anexos da view para o tipo do payload
    const arquivosPayload: IArquivo[] = (item.Arquivos ?? []).map(a => ({
      LinkArquivo: a.LinkArquivo
    }));

    const mensagemAtualizada: IMensagem = {
      // Se a API exigir o ID no body, mantenha; senão remova:
      // @ts-ignore
      MensagemID: item.MensagemID,
      UsuarioID: item.UsuarioID,
      Mensagem: texto,
      DataHoraInicio: item.DataHoraInicio,
      DataHoraFim: this.getLocalISODateString(new Date()),
      Arquivos: arquivosPayload,
      Interno: !!item.Interno
    };

    this.carregando = true;
    try {
      await firstValueFrom(
        this.mensagemChamadoService.atualizarMensagem(
          this.editandoId,
          mensagemAtualizada
        )
      );

      // Update otimista: NÃO sobrescreva Arquivos (para não quebrar o tipo)
      const alvo = this.chamadoAtual.Mensagens.find(m => m.MensagemID === this.editandoId);
      if (alvo) {
        alvo.Mensagem = mensagemAtualizada.Mensagem;
        alvo.DataHoraFim = mensagemAtualizada.DataHoraFim;
        // alvo.Arquivos permanece como IArquivoView[]
      }

      this.chamadoAtual.Mensagens = this.ordenarMensagensNosChamados(this.chamadoAtual);
      this.cancelarEdicao();
    } catch (err) {
      console.error('Erro ao salvar edição:', err);
    } finally {
      this.carregando = false;
    }
  }

  protected abrirPreviewDeUrl(url: string) {
    if (this.isImageView(url)) this.preview = { aberto: true, src: url, tipo: 'image', excel: null, };
    else if (this.isVideoView(url)) this.preview = { aberto: true, src: url, tipo: 'video', excel: null, };
    else if (this.isAudioView(url)) this.preview = { aberto: true, src: url, tipo: 'audio', excel: null, };
    else if (this.isPdfView(url)) this.preview = { aberto: true, src: url, tipo: 'pdf', excel: null, };
    else if (this.isExcelView(url)) this.openExcelPreview(url);
  }

  // Onde abre arquivo local:
  protected async abrirPreviewDeArquivo(arquivo: { id?: string; base64: string; tipo: string; nome?: string }) {
    const kind = this.getPreviewKind(arquivo.tipo);

    // tenta pegar blob real do IndexedDB (mais confiável que base64)
    const blob = arquivo.id ? await this.draftDb.getById?.(arquivo.id) : null; // depende do seu service ter esse método
    const sizeBytes = blob?.blob?.size ?? this.estimateBase64Size(arquivo.base64);

    // bloqueio por tamanho
    const limit = this.getLimitForKind(kind);
    if (limit && sizeBytes > limit) {
      this.bloquearPreview(`"${arquivo.nome || 'Arquivo'}" é muito grande para visualizar aqui. Baixe-o para abrir.`);
      return;
    }

    // abre conforme tipo
    if (kind === 'image') {
      this.preview = { aberto: true, src: arquivo.base64, tipo: 'image', excel: null };
    } else if (kind === 'video') {
      this.preview = { aberto: true, src: arquivo.base64, tipo: 'video', excel: null };
    } else if (kind === 'audio') {
      this.preview = { aberto: true, src: arquivo.base64, tipo: 'audio', excel: null };
    } else if (kind === 'pdf') {
      this.preview = { aberto: true, src: arquivo.base64, tipo: 'pdf', excel: null };
    } else if (kind === 'excel') {
      // excel: além do tamanho, mantém seu guard por células
      await this.openExcelPreview(arquivo.base64);
    }
  }

  protected fecharPreview() {
    this.preview = { aberto: false, src: '', tipo: '', excel: null, };
    this.zoomed = false;
    this.transformOrigin = '50% 50%';
  }

  protected toggleZoomAtClick(
    ev: MouseEvent,
    imgEl: HTMLImageElement,
    bodyEl: HTMLElement
  ) {
    ev.preventDefault();

    // posição do clique dentro da imagem (0..1)
    const rect = imgEl.getBoundingClientRect();
    const cx = (ev.clientX - rect.left) / rect.width;
    const cy = (ev.clientY - rect.top) / rect.height;

    // aplica o transform-origin no ponto clicado
    this.transformOrigin = `${(cx * 100).toFixed(2)}% ${(cy * 100).toFixed(2)}%`;

    // alterna o zoom
    this.zoomed = !this.zoomed;
  }

  private async readWorkbookFromSrc(src: string): Promise<XLSX.WorkBook> {
    if (src.startsWith('data:')) {
      // base64
      const base64 = src.split(',')[1] || '';
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return XLSX.read(bytes, { type: 'array' });
    } else {
      // URL (precisa CORS liberado)
      const resp = await fetch(src);
      const buf = await resp.arrayBuffer();
      return XLSX.read(buf, { type: 'array' });
    }
  }

  private sheetToRows(ws: XLSX.WorkSheet): any[][] {
    // header:1 => retorna matriz (linhas/colunas), preservando estrutura
    return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[][];
  }

  /** Regra de segurança/performance: bloqueia arquivos muito grandes */
  private isWorkbookTooLarge(wb: XLSX.WorkBook): boolean {
    // exemplo: > 200k células estimadas => bloqueia
    let cells = 0;
    for (const s of wb.SheetNames) {
      const ref = wb.Sheets[s]['!ref'];
      if (!ref) continue;
      const range = XLSX.utils.decode_range(ref);
      cells += (range.e.r - range.s.r + 1) * (range.e.c - range.s.c + 1);
      if (cells > 200_000) return true;
    }
    return false;
  }

  private async openExcelPreview(src: string) {
    try {
      const wb = await this.readWorkbookFromSrc(src);
      if (this.isWorkbookTooLarge(wb)) {
        this.mensagemService.adicionarMensagem(
          'Esta planilha é muito grande para visualizar aqui. Faça o download para abrir.'
        );
        return;
      }

      const sheets = wb.SheetNames.map(name => {
        const ws = wb.Sheets[name];
        const rows = this.sheetToRows(ws);
        return { name, rows };
      });

      this.preview = {
        aberto: true,
        src,
        tipo: 'excel',
        excel: { sheets, activeIndex: 0 }
      };
    } catch (err) {
      console.error('Falha ao ler Excel:', err);
      this.mensagemService.adicionarMensagem(
        'Arquivo muito grande para leitura. Baixe-o para abrir.'
      );
    }
  }

  // ---- Detectores extra (vídeo/áudio) ----
  protected isVideoView(url: string): boolean {
    return /\.(mp4|webm|ogg)$/i.test(url);
  }
  protected isAudioView(url: string): boolean {
    return /\.(mp3|wav|ogg|m4a)$/i.test(url);
  }
  protected isVideoMime(mime: string): boolean {
    return /^video\//i.test(mime);
  }
  protected isAudioMime(mime: string): boolean {
    return /^audio\//i.test(mime);
  }
  protected isPdfView(url: string): boolean {
    return /\.pdf(\?|#|$)/i.test(url);
  }
  protected isPdfMime(mime: string): boolean {
    return mime === 'application/pdf';
  }
  protected isExcelView(url: string): boolean {
    return /\.(xlsx|xls|csv)$/i.test(url);
  }
  protected isExcelMime(mime: string): boolean {
    return /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.ms-excel|text\/csv/i.test(mime);
  }

  protected getDocSafeUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.preview.src);
  }

  protected getPdfSafeUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.preview.src);
  }

  // ===== Helper comum para adicionar arquivos =====
  private async processFiles(files: File[]) {
    for (const file of files) {
      // (opcional) valide tipos/tamanho aqui
      const base64 = await this.readFileAsDataURL(file);
      this.arquivosSelecionados.push({
        nome: file.name,
        base64,
        tipo: file.type
      });
    }
  }

  private readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ===== Cole: captura arquivos do clipboard =====
  onPasteEditor(ev: ClipboardEvent) {
    const dt = ev.clipboardData;
    if (!dt) return;

    const files: File[] = [];

    // 1) Itens como arquivo (ex.: imagens do print/paste)
    for (let i = 0; i < dt.items.length; i++) {
      const it = dt.items[i];
      if (it.kind === 'file') {
        const file = it.getAsFile();
        if (file && this.isMimeSuportado(file.type)) files.push(file);
      }
    }

    // 2) Data URL no texto (ex.: colou uma imagem base64)
    if (files.length === 0) {
      const text = dt.getData('text/plain') || '';
      if (text.startsWith('data:')) {
        const f = this.dataURLtoFile(text, 'clipboard-item');
        if (f && this.isMimeSuportado(f.type)) files.push(f);
      }
    }

    // se houver arquivo, evita colar texto e adiciona aos anexos
    if (files.length > 0) {
      ev.preventDefault();
      this.processFiles(files);
    }
  }

  // ===== Arrastar & soltar no textarea (opcional) =====
  onDragOver(ev: DragEvent) { ev.preventDefault(); }
  onDropFiles(ev: DragEvent) {
    ev.preventDefault();
    const list = ev.dataTransfer?.files;
    if (!list || list.length === 0) return;
    const files: File[] = [];
    for (let i = 0; i < list.length; i++) {
      const f = list.item(i)!;
      if (this.isMimeSuportado(f.type)) files.push(f);
    }
    if (files.length) this.processFiles(files);
  }

  private isMimeSuportado(mime: string): boolean {
    return (
      this.isImage(mime) ||
      this.isVideoMime(mime) ||
      this.isAudioMime(mime) ||
      this.isPdfMime(mime) ||
      this.isExcelMime(mime)
    );
  }

  // ===== Converte dataURL -> File (para quando colam base64 em texto) =====
  private dataURLtoFile(dataUrl: string, filename: string): File | null {
    try {
      const arr = dataUrl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime: string = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8 = new Uint8Array(n);
      while (n--) u8[n] = bstr.charCodeAt(n);
      return new File([u8], filename, { type: mime });
    } catch {
      return null;
    }
  }

  trackByHistoricoId(_: number, item: IHistoricoChamado) {
    return item.HistoricoChamadoID;
  }


  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.historicoChamadoAberto) this.historicoChamadoAberto = false;
  }

  protected alterarServicoChamado(): void {
    const servicoId = this.formularioChamado.get('ServicoID')?.value || null;

    // monta tipos do serviço (sempre sem “Comum”)
    this.tiposServico = this.montarTiposDoServico(servicoId);

    // zera o tipo (evita combinações inválidas)
    this.formularioChamado.patchValue({ TipoServicoID: '' });

    // como o usuário interagiu com Serviço/Tipo, estas flags deixam de valer
    this.tipoPreSelecionadoEraComum = false;
    this.originalTipoServicoComumId = null;

    this.atualizarChamado();
  }

  protected alterarDepartamentoResponsavelChamado(): void {
    const depId = this.formularioChamado.get('DepartamentoResponsavelID')?.value;

    // rebuild responsáveis
    this.usuariosTecnicosPorDepartamento = this.usuariosTecnicos
      .filter(u => u.DepartamentoResponsavelID === depId)
      .sort((a, b) => a.Nome.localeCompare(b.Nome));

    // listas SEM “Comum”
    this.servicosPorDepartamento = this.montarServicosDoDep(depId);
    this.tiposServico = [];

    // limpamos as flags de “Comum” original (departamento mudou)
    this.servicoPreSelecionadoEraComum = false;
    this.originalServicoComumId = null;
    this.tipoPreSelecionadoEraComum = false;
    this.originalTipoServicoComumId = null;

    // zera campos dependentes
    this.formularioChamado.patchValue({
      UsuarioResponsavelID: '',
      ServicoID: '',
      TipoServicoID: ''
    });

    this.atualizarChamado();


    // zera campos dependentes e limpa tipos (pois trocou dep)
    this.formularioChamado.patchValue({
      UsuarioResponsavelID: '',
      ServicoID: '',
      TipoServicoID: ''
    });

    this.atualizarChamado();
  }

  /** Converte ISO armazenado para o formato que o <input type="datetime-local"> entende (YYYY-MM-DDTHH:mm) */
  protected toLocalDatetimeValue(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  /** Recebe o valor do input (local) e armazena no form em ISO local (YYYY-MM-DDTHH:mm:ss) */
  protected onDateTimeChange(value: string, controlName: 'DataHoraInicioProjeto' | 'DataHoraEstimado'): void {
    if (!value) {
      this.formularioChamado.get(controlName)?.setValue(null);
      return;
    }
    const d = new Date(value); // valor em horário local
    this.formularioChamado.get(controlName)?.setValue(this.getLocalISODateString(d));

    this.atualizarChamado();
  }

  /** Calcula minutos úteis entre duas datas (exclui fins de semana e só conta 07:00-12:00 e 14:00-18:00). */
  private businessMinutesBetween(a: Date, b: Date): number {
    let start = new Date(a);
    let end = new Date(b);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    if (end <= start) return 0;

    // Normaliza pra minuto cheio (evita ruído de segundos)
    start.setSeconds(0, 0);
    end.setSeconds(0, 0);

    // Janelas do dia (em minutos a partir de 00:00)
    const blocks = [
      { s: 7 * 60, e: 12 * 60 },    // 07:00–12:00
      { s: 14 * 60, e: 18 * 60 },    // 14:00–18:00
    ];

    const toMin = (d: Date) => d.getHours() * 60 + d.getMinutes();
    const isWeekend = (d: Date) => {
      const dow = d.getDay(); // 0=Dom, 6=Sáb
      return dow === 0 || dow === 6;
    };

    // Itera dia a dia
    let cur = new Date(start);
    let total = 0;
    while (cur < end) {
      if (!isWeekend(cur)) {
        // limites do dia corrente
        const dayStart = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 0, 0, 0, 0);
        const dayEnd = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 23, 59, 59, 999);

        // intervalo do dia intersectado com [start, end]
        const segIni = cur > start ? cur : start;
        const segFim = dayEnd < end ? dayEnd : end;

        if (segFim > segIni) {
          // minutos dentro do dia
          const segIniMin = toMin(segIni);
          const segFimMin = toMin(segFim);

          for (const blk of blocks) {
            const iStart = Math.max(segIniMin, blk.s);
            const iEnd = Math.min(segFimMin, blk.e);
            if (iEnd > iStart) total += (iEnd - iStart);
          }
        }
      }

      // avança para o próximo dia 00:00
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1, 0, 0, 0, 0);
    }

    return total;
  }

  /** Formata minutos em "Xd Yh Zm" (omitindo partes zeradas). */
  private formatMinutesHuman(mins: number): string {
    const m = Math.max(0, Math.round(mins));
    const dias = Math.floor(m / (8 * 60));         // 8h úteis por dia (07-12 e 14-18)
    const resto = m % (8 * 60);
    const horas = Math.floor(resto / 60);
    const minutos = resto % 60;

    const parts: string[] = [];
    if (dias) parts.push(`${dias}d`);
    if (horas) parts.push(`${horas}h`);
    if (minutos || parts.length === 0) parts.push(`${minutos}m`);
    return parts.join(' ');
  }

  /** Helper: lê do form um ISO e devolve Date ou null */
  private getDateFromForm(ctrl: string): Date | null {
    const v = this.formularioChamado.get(ctrl)?.value;
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Monta infos pro card do projeto:
   * - duracao útil (entre início e fim/AGORA)
   * - atraso (se passou do estimado), comparando fim/AGORA com estimado
   * - restante (se não finalizado e tem estimado)
   */
  protected projetoTempo(): {
    duracaoMin: number;
    duracaoFmt: string;
    temEstimado: boolean;
    passou: boolean;
    atrasoMin?: number;
    atrasoFmt?: string;
    restanteFmt?: string;
    finalizado: boolean;
  } {
    const ini = this.getDateFromForm('DataHoraInicioProjeto');
    const est = this.getDateFromForm('DataHoraEstimado');
    const fim = this.getDateFromForm('DataHoraFinalizacaoProjeto');

    const finalizado = !!fim;
    const agora = new Date();

    // sem início: não calcula nada
    if (!ini) {
      return {
        duracaoMin: 0,
        duracaoFmt: '',
        temEstimado: !!est,
        passou: false,
        finalizado
      };
    }

    const ate = fim || agora;

    const durMin = this.businessMinutesBetween(ini, ate);

    // base
    const out: any = {
      duracaoMin: durMin,
      duracaoFmt: this.formatMinutesHuman(durMin),
      temEstimado: !!est,
      passou: false,        
      finalizado
    };

    if (!est) return out;

    const ref = fim || agora;

    const passou = ref.getTime() > est.getTime();
    out.passou = passou;

    if (passou) {
      // atraso útil (se est for inválido/menor que ref, businessMinutesBetween já cuida)
      const atrasoMin = this.businessMinutesBetween(est, ref);
      out.atrasoMin = atrasoMin;
      out.atrasoFmt = this.formatMinutesHuman(atrasoMin);
    } else if (!finalizado) {
      // restante útil até o estimado (garante não-negativo)
      const restanteMin = this.businessMinutesBetween(ate, est);
      out.restanteFmt = this.formatMinutesHuman(restanteMin);
    }

    return out;
  }

  private isNomeComum(txt?: string | null): boolean {
    return (txt || '').trim().toLowerCase() === 'comum';
  }

  private montarServicosDoDep(depId: string): IServico[] {
    return this.servicos
      .filter(s => s.DepartamentoResponsavelID === depId && !this.isNomeComum(s.Servico))
      .sort((a, b) => a.Servico.localeCompare(b.Servico));
  }

  private montarTiposDoServico(servicoId?: string | null): ITipoServico[] {
    const tipos = (this.servicos.find(s => s.ServicoID === servicoId)?.TipoServico || []);
    return tipos
      .filter(t => !this.isNomeComum(t.TipoServico))
      .sort((a, b) => a.TipoServico.localeCompare(b.TipoServico));
  }

  protected adicionarRemoverAuxiliar(): void {
    // Antes (estado atual do chamado)
    const auxAntesArr = (this.chamadoAtual?.UsuariosAuxiliares || [])
      .map(a => a.UsuarioID)
      .filter(Boolean);

    const auxAntes = new Set(auxAntesArr);

    // Depois (o que está no form agora)
    const auxDepoisArr: string[] = (this.formularioChamado.get('AuxiliaresIDs')?.value || [])
      .filter(Boolean);

    const auxDepois = new Set(auxDepoisArr);

    // ADICIONADOS (não filtra this.usuarioID aqui!)
    const adicionados = Array.from(auxDepois).filter(id => !auxAntes.has(id));

    // REMOVIDOS (pra limpar dedup do WhatsApp)
    const removidos = Array.from(auxAntes).filter(id => !auxDepois.has(id));

    // Atualiza chamado
    this.atualizarChamado();

    // Se alguém foi removido, libera a deduplicação do WhatsApp dessa pessoa
    for (const id of removidos) {
      const u = this.usuarios.find(x => x.UsuarioID === id);
      if (u?.Telefone) {
        const key = `auxiliar-adicionado:${u.Telefone}:${this.chamadoID}`;
        this._waInFlight.delete(key);
      }
    }

    // Se ninguém foi adicionado, sai (não notifica/whatsapp)
    if (!adicionados.length) {
      this.chamadoAtual.UsuariosAuxiliares = auxDepoisArr.map(id => ({ UsuarioID: id } as any));
      return;
    }

    // ===== Notificações internas =====
    const notifs$ = adicionados.map(destId =>
      this.safeCritical(
        this.notificacaoService.criarNotificacao({
          Mensagem: `Você foi adicionado como auxiliar no chamado: ${this.chamadoAtual?.Titulo || ''}`,
          UsuarioID: destId,
          UrlDestino: this.detalhesUrl,
          ChamadoID: this.chamadoID
        }),
        'notificacao auxiliar adicionado'
      )
    );

    firstValueFrom(forkJoin(notifs$)).catch(err =>
      console.error('Erro ao notificar auxiliares adicionados:', err)
    );

    // ===== WhatsApp (best effort) =====
    for (const destId of adicionados) {
      const dest = this.usuarios.find(u => u.UsuarioID === destId);
      if (dest?.Telefone) {
        const key = `auxiliar-adicionado:${dest.Telefone}:${this.chamadoID}`;
        this.sendWhatsAppOnce(
          key,
          this.whatsappService.enviarMensagemWhatsApp({
            Nome: dest.Nome,
            Telefone: dest.Telefone,
            TemplateId: '1286878353243538',
            BodyParameters: [
              dest.Nome,
              this.chamadoAtual.Titulo,
              this.detalhesLinkPublico
            ]
          }),
          30000,
          'whatsapp auxiliar adicionado'
        );
      }
    }

    // Atualiza estado local
    this.chamadoAtual.UsuariosAuxiliares = auxDepoisArr.map(id => ({ UsuarioID: id } as any));
  }

  private get detalhesUrl(): string {
    return `Chamados/Detalhes/Sac/${this.chamadoID}`;
  }

  private get detalhesLinkPublico(): string {
    return `https://work.bebidasprojeto.com.br/Chamados/Detalhes/Sac/${this.chamadoID}`;
  }

  protected toDateOnly(v: any): string {
    if (!v) return '';
    const s = String(v);
    // se vier ISO "YYYY-MM-DDTHH:mm:ss" ou "YYYY-MM-DD..."
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    // fallback (se vier Date)
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  protected formatCep(cep?: string): string {
    const d = (cep || '').replace(/\D/g, '');
    if (d.length !== 8) return (cep || '').trim() || '—';
    return `${d.slice(0, 5)}-${d.slice(5)}`;
  }

  protected formatTelefoneBR(tel?: string): string {
    const d = (tel || '').replace(/\D/g, '');
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    return (tel || '').trim() || '—';
  }

  protected enderecoCliente(c: any): string {
    if (!c) return '—';
    const tipo = (c.TipoLogradouro || '').trim();
    const log = (c.Logradouro || '').trim();
    const num = (c.NumeroLogradouro || '').trim();
    const comp = (c.Complemento || '').trim();
    const bairro = (c.Bairro || '').trim();
    const cidade = (c.Cidade || '').trim();
    const uf = (c.Uf || '').trim();
    const cep = this.formatCep(c.Cep);

    const linha1 = [tipo, log, num].filter(Boolean).join(' ');
    const linha2 = [comp, bairro].filter(Boolean).join(' - ');
    const linha3 = [cidade, uf].filter(Boolean).join(' / ');

    return [linha1, linha2, linha3, cep !== '—' ? `CEP ${cep}` : '']
      .filter(Boolean)
      .join(' • ');
  }

  async baixarRelatorioPdf(): Promise<void> {
    const chamadoAtual = await this.chamadoService.buscarChamado(this.chamadoID).toPromise();

    this.router.navigate(
      [`/Chamados/Detalhes/Sac/${this.chamadoID}/Relatorio`],
      {
        state: {
          chamadoID: this.chamadoID,
          chamado: chamadoAtual,
          usuarios: this.usuarios,
          departamentos: this.departamentosResponsaveis,
          servicos: this.servicos,
          formasContato: this.formasContato,
          categorias: this.categorias,
          clientes: this.clientes,
        }
      }
    );
  }

  private bloquearPreview(motivo?: string) {
    this.mensagemService.adicionarMensagem(
      motivo || 'Este arquivo é muito grande para visualizar aqui. Baixe-o para abrir.'
    );
  }

  private getPreviewKind(mime: string): 'image' | 'video' | 'audio' | 'pdf' | 'excel' | '' {
    if (this.isImage(mime)) return 'image';
    if (this.isVideoMime(mime)) return 'video';
    if (this.isAudioMime(mime)) return 'audio';
    if (this.isPdfMime(mime)) return 'pdf';
    if (this.isExcelMime(mime)) return 'excel';
    return '';
  }

  private getLimitForKind(kind: ReturnType<DetalhesChamadosSacComponent['getPreviewKind']>) {
    if (!kind) return null;
    return (this.PREVIEW_LIMITS as any)[kind] as number | undefined;
  }

  // fallback quando não tiver blob: estima tamanho do base64
  private estimateBase64Size(dataUrl: string): number {
    if (!dataUrl?.startsWith('data:')) return 0;
    const base64 = dataUrl.split(',')[1] || '';
    // base64 -> bytes aproximados
    return Math.floor((base64.length * 3) / 4);
  }

  protected onPreviewRenderError() {
    this.fecharPreview();
    this.bloquearPreview('Não foi possível pré-visualizar este arquivo aqui. Baixe-o para abrir.');
  }

  private aplicarBloqueioDatasSAC(): void {
    const bloqueado = this.chamadoAtual?.Status === 'Finalizado' || this.chamadoAtual?.Status === 'Cancelado';

    const fab = this.formularioChamado.get('Fabricacao');
    const val = this.formularioChamado.get('Validade');

    if (bloqueado) {
      fab?.disable({ emitEvent: false });
      val?.disable({ emitEvent: false });
    } else {
      fab?.enable({ emitEvent: false });
      val?.enable({ emitEvent: false });
    }
  }
}
