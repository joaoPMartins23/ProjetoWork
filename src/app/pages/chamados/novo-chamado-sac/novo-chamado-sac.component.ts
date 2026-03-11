import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as CryptoJS from 'crypto-js';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import * as XLSX from 'xlsx';
import { Location } from '@angular/common';
import { UiBridgeService } from 'src/app/services/unicos/UiBridge.service';

import { environment } from 'src/environments/environment';
import { DepartamentoResponsavelService } from 'src/app/services/chamados/departamentoResponsavel.service';
import { ServicoService } from 'src/app/services/chamados/servico.service';
import { UsuarioService } from 'src/app/services/cruds/cadastros/usuario.service';
import { IDepartamentoResponsavel } from 'src/app/modules/chamados/departamentoResponsavel.interface';
import { IServico } from 'src/app/modules/chamados/service.interface';
import { ITipoServico } from './../../../modules/chamados/service.interface';
import { IUsuarioView } from 'src/app/modules/cruds/cadastros/usuario.interface';
import { IChamadoForm } from 'src/app/modules/chamados/chamado.interface';
import { ChamadoService } from 'src/app/services/chamados/chamado.service';
import { MensagemService } from 'src/app/services/mensagem.service';
import { Router } from '@angular/router';
import { NotificacaoService } from 'src/app/services/notificacao.service';
import { WhatsappService } from 'src/app/services/chamados/whatsapp.service';
import { IWhatsappEnvio } from 'src/app/modules/chamados/whatsapp.interface';
import { IBloco } from 'src/app/modules/chamados/bloco.interface';
import { BlocoService } from 'src/app/services/chamados/bloco.service';
import { IProjetoView } from 'src/app/modules/cruds/cadastros/projeto.interface';
import { ProjetoService } from 'src/app/services/cruds/cadastros/projeto.service';
import { notOnlyWhitespaceValidator } from 'src/app/helpers/notOnlyWhitespaceValidator';

import { DraftAttachmentsDbService } from 'src/app/services/unicos/draft-attachments.db.service';
import { IFormaContato } from 'src/app/modules/chamados/formaContato.interface';
import { ICategoria } from 'src/app/modules/chamados/categoria.interface';
import { IProduto } from 'src/app/modules/chamados/produto.interface';
import { IClienteView } from 'src/app/modules/cruds/cadastros/cliente.interface';
import { CategoriaService } from 'src/app/services/chamados/categoria.service';
import { FormaContatoService } from 'src/app/services/chamados/formaContato.service';
import { ClienteService } from 'src/app/services/cruds/cadastros/cliente.service';
import { ProdutoService } from 'src/app/services/chamados/produto.service';
@Component({
  selector: 'app-novo-chamado-sac',
  templateUrl: './novo-chamado-sac.component.html',
  styleUrl: './novo-chamado-sac.component.scss'
})
export class NovoChamadoSacComponent implements OnInit {
  protected carregando: boolean = true;

  protected showPhoneGuard = false;

  public alertaTelefoneAberto = false;

  protected dataHorarioAtual: string = this.getLocalISODateString(new Date());

  protected usuarioID: string = CryptoJS.AES.decrypt(localStorage.getItem('UsuarioID') || '', environment.chavePrivada).toString(CryptoJS.enc.Utf8);
  protected perfilAcessoUsuario: string = CryptoJS.AES.decrypt(localStorage.getItem('PerfilAcesso') || '', environment.chavePrivada).toString(CryptoJS.enc.Utf8);

  protected formularioChamado!: FormGroup;
  protected arquivoSelecionado: File | null = null;

  protected arquivosSelecionados: { id: string; nome: string; base64: string; tipo: string }[] = [];

  protected prioridades = [
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

  // Novos para SAC
  protected formasContato: IFormaContato[] = [];
  protected categorias: ICategoria[] = [];
  protected produtos: IProduto[] = [];
  protected clientes: IClienteView[] = [];

  protected preview = {
    aberto: false,
    src: '' as string,
    tipo: '' as 'image' | 'video' | 'audio' | 'pdf' | 'excel' | '',
    excel: null as null | {
      sheets: { name: string; rows: any[][] }[];
      activeIndex: number;
    }
  };

  protected zoomed = false;
  protected transformOrigin = '50% 50%';

  private readonly DRAFT_KEY = 'novo-chamado-draft-v1';

  private readonly PREVIEW_LIMITS = {
    image: 8 * 1024 * 1024,  // 8 MB
    pdf: 15 * 1024 * 1024, // 15 MB
    excel: 10 * 1024 * 1024, // 10 MB (além do limite por células)
    video: 25 * 1024 * 1024, // 25 MB
    audio: 10 * 1024 * 1024, // 10 MB
  };

  constructor(
    private fb: FormBuilder,
    private usuarioService: UsuarioService,
    private departamentoResponsavelService: DepartamentoResponsavelService,
    private servicoService: ServicoService,
    private blocoService: BlocoService,
    private chamadoService: ChamadoService,
    private menssagemService: MensagemService,
    private notificacaoService: NotificacaoService,
    private whatsappService: WhatsappService,
    private mensagemService: MensagemService,
    private projetoService: ProjetoService,
    private router: Router,
    private sanitizer: DomSanitizer,
    private location: Location,
    private uiBridge: UiBridgeService,
    private draftDb: DraftAttachmentsDbService,
    private categoriaService: CategoriaService,
    private formaContatoService: FormaContatoService,
    private clienteService: ClienteService,
    private produtoService: ProdutoService,
  ) { }

  async ngOnInit(): Promise<void> {
    const isAdmin = this.perfilAcessoUsuario === 'Administrador' || this.perfilAcessoUsuario === 'SuperAdministrador';

    this.formularioChamado = this.fb.group({
      Titulo: ['', Validators.required],
      Prioridade: ['', Validators.required],
      BlocoID: [''],
      UsuarioCriacaoID: [''],
      DepartamentoResponsavelID: ['', Validators.required],
      UsuarioResponsavelID: [{ value: '', disabled: true }],
      ServicoID: [{ value: '', disabled: true }, Validators.required],
      TipoServicoID: [{ value: '', disabled: true }, Validators.required],
      Mensagem: ['', [Validators.required, notOnlyWhitespaceValidator]],
      AuxiliaresIDs: [{ value: [] }],
      ProjetoID: [{ value: '', disabled: !isAdmin }],
      DataHoraInicioProjeto: [{ value: '', disabled: !isAdmin }],
      DataHoraEstimado: [{ value: '', disabled: !isAdmin }],
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

    this.restoreDraft();
    await this.restoreAttachments();
    this.setupDraftAutosave();

    try {
      const usuarios = await this.usuarioService.buscarUsuarios().toPromise() || [];
      this.usuarios = usuarios.filter(usuario => usuario.Ativo);
      this.usuarios = usuarios
        .filter(usuario => usuario.Ativo)
        .sort((a, b) => a.Nome.localeCompare(b.Nome));

      this.usuariosTecnicos = usuarios.filter(usuario => (usuario.PerfilAcesso === 'Tecnico' || usuario.PerfilAcesso === 'Administrador' || usuario.PerfilAcesso === 'SuperAdministrador') && usuario.Ativo);

      this.departamentosResponsaveis = await this.departamentoResponsavelService.buscarDepartamentosResponsaveis().toPromise() || [];

      this.servicos = await this.servicoService.buscarServicos().toPromise() || [];

      this.blocos = (await this.blocoService.buscarBlocos().toPromise() || [])
        .sort((a, b) => {
          const letraA = a.Bloco.match(/^Bloco\s+([A-Z])/i)?.[1] || '';
          const letraB = b.Bloco.match(/^Bloco\s+([A-Z])/i)?.[1] || '';
          return letraA.localeCompare(letraB);
        });

      this.projetos = await this.projetoService.buscarProjetos().toPromise() || [];

      this.formasContato = await this.formaContatoService.buscarFormasContato().toPromise() || [];
      this.categorias = await this.categoriaService.buscarCategorias().toPromise() || [];
      this.clientes = await this.clienteService.buscarClientes().toPromise() || [];
      this.produtos = (await this.produtoService.buscarProdutos().toPromise() || [])
        .slice()
        .sort((a, b) => (a.ProdutoDescricao || '').localeCompare(b.ProdutoDescricao || '', 'pt-BR'));

      await this.hidratarCombosDoDraft();

      this.iniciarDepartamentoFixo('EC526DA6-08C3-440E-A64E-AED504AF96DF');

      // Ao selecionar o Serviço
      this.formularioChamado.get('ServicoID')?.valueChanges.subscribe(servicoID => {
        if (servicoID) {
          this.tiposServico = [];
          this.tiposServico = this.servicos.find(servico => servico.ServicoID === servicoID)?.TipoServico || [];
          this.tiposServico = this.servicos
            .find(servico => servico.ServicoID === servicoID)
            ?.TipoServico.sort((a, b) => a.TipoServico.localeCompare(b.TipoServico)) || [];

          this.formularioChamado.get('TipoServicoID')?.enable();
        } else {
          this.formularioChamado.get('TipoServicoID')?.reset();
          this.formularioChamado.get('TipoServicoID')?.disable();
        }
      });
    }
    catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
    finally {
      this.carregando = false;
      this.checarTelefoneObrigatorio();
    }
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
    this.location.back();
  }

  public irParaCadastroTelefone(): void {
    this.alertaTelefoneAberto = false;
    this.router.navigate(['/MeuPerfil/AtualizarTelefone']);
  }

  public voltarPaginaAnterior(): void {
    this.alertaTelefoneAberto = false;
    this.location.back();
  }

  onFileSelected(event: any): void {
    const list: FileList = event.target.files;
    const files: File[] = [];
    for (let i = 0; i < list.length; i++) files.push(list.item(i)!);
    this.processFiles(files);
    event.target.value = '';
  }

  async removerArquivo(index: number): Promise<void> {
    const item = this.arquivosSelecionados[index];
    if (item?.id) await this.draftDb.deleteById(item.id);
    this.arquivosSelecionados.splice(index, 1);
  }

  isImage(tipo: string): boolean {
    return tipo.startsWith('image/');
  }

  meAtribuirComoSolicitante(): void {
    const usuarioID = CryptoJS.AES.decrypt(localStorage.getItem('UsuarioID') || '', environment.chavePrivada).toString(CryptoJS.enc.Utf8);
    this.formularioChamado.get('UsuarioCriacaoID')?.setValue(usuarioID);
  }

  onSubmit(): void {
    if (this.formularioChamado.valid) {
      this.carregando = true;

      const raw = this.formularioChamado.getRawValue();

      const auxiliares = Array.isArray(raw.AuxiliaresIDs) ? raw.AuxiliaresIDs : [];

      const textoOriginal = raw.Mensagem || '';
      const textoComCRLF = textoOriginal.replace(/\r?\n/g, '\r\n');

      const chamado: IChamadoForm = {
        // ===== BÁSICO =====
        Titulo: raw.Titulo,
        Prioridade: raw.Prioridade,
        DataHora: this.getLocalISODateString(new Date()),
        Status: 'Em espera',

        // ===== USUÁRIOS =====
        UsuarioCriacaoID: raw.UsuarioCriacaoID || this.usuarioID,
        UsuarioResponsavelID: raw.UsuarioResponsavelID || null,
        UsuarioRealizacaoID: this.usuarioID,

        // ===== DEPARTAMENTO / SERVIÇO =====
        DepartamentoResponsavelID: raw.DepartamentoResponsavelID,
        ServicoID: raw.ServicoID,
        TipoServicoID: raw.TipoServicoID,

        // ===== LOCAL =====
        BlocoID: raw.BlocoID || null,

        // ===== SAC (NOVOS) =====
        FormaContatoID: raw.FormaContatoID || null,
        CategoriaID: raw.CategoriaID || null,
        ClienteID: raw.ClienteID || null,
        Produto: raw.Produto || null,
        LoteProduto: raw.Lote || null,
        Fabricacao: raw.Fabricacao || null,
        Validade: raw.Validade || null,
        HoraEnvase: raw.HoraEnvase
          ? (String(raw.HoraEnvase).length === 5 ? `${raw.HoraEnvase}:00` : raw.HoraEnvase)
          : null,
        QuantidadeProduto: raw.Quantidade || null,
        LocalCompra: raw.LocalCompra || null,
        Estado: raw.EstadoProduto || null,

        // ===== AUXILIARES =====
        UsuariosAuxiliares: auxiliares.map((id: string) => ({ UsuarioID: id })),


        // ===== MENSAGEM =====
        Mensagens: {
          UsuarioID: this.usuarioID,
          Mensagem: textoComCRLF,
          DataHoraInicio: this.dataHorarioAtual,
          DataHoraFim: this.getLocalISODateString(new Date()),
          Interno: false,
          Arquivos: this.arquivosSelecionados.map(a => ({
            LinkArquivo: a.base64,
            NomeArquivo: a.nome,
            TipoMime: a.tipo
          }))
        },

        // ===== PROJETO (ADMIN) =====
        ProjetoID: raw.ProjetoID || null,
        DataHoraInicioProjeto: raw.DataHoraInicioProjeto || null,
        DataHoraFinalizacaoProjeto: null,
        DataHoraEstimado: raw.DataHoraEstimado || null,

        // ===== FINALIZAÇÃO =====
        DataHoraFinalizacao: null,
        UsuarioFinalizacaoID: null
      };

      this.chamadoService.criarChamado(chamado).subscribe({
        next: async (response) => {
          await this.draftDb.clearDraft(this.DRAFT_KEY);

          sessionStorage.removeItem(this.DRAFT_KEY);

          const usuarioID = CryptoJS.AES.decrypt(
            localStorage.getItem('UsuarioID') || '',
            environment.chavePrivada
          ).toString(CryptoJS.enc.Utf8);

          const criadorID = chamado.UsuarioCriacaoID;
          const responsavelID = chamado.UsuarioResponsavelID;
          const auxiliaresIDs: string[] = (chamado.UsuariosAuxiliares || []).map(u => u.UsuarioID);

          // --- Notificação para responsável (se houver)
          if (responsavelID !== null) {
            this.notificacaoService.criarNotificacao({
              Mensagem: `Novo chamado atribuído a você!`,
              UsuarioID: responsavelID,
              UrlDestino: `Chamados/Detalhes/Sac/${response.ChamadoID}`,
              ChamadoID: response.ChamadoID
            }).subscribe();
          }

          // --- Notificações para cada AUXILIAR
          if (auxiliaresIDs.length) {
            auxiliaresIDs.forEach(auxId => {
              this.notificacaoService.criarNotificacao({
                Mensagem: `Você foi colocado em cópia em um novo chamado!`,
                UsuarioID: auxId,
                UrlDestino: `Chamados/Detalhes/Sac/${response.ChamadoID}`,
                ChamadoID: response.ChamadoID
              }).subscribe();
            });
          }

          // --- WhatsApp conforme sua regra atual
          const deveChamarMinhaFuncao =
            (usuarioID === criadorID && responsavelID !== null) ||
            (usuarioID !== criadorID) ||
            (usuarioID !== responsavelID);

          if (deveChamarMinhaFuncao) {
            this.enviarMensagemWhatsapp(chamado, response.ChamadoID);
          }

          // --- WhatsApp para AUXILIARES (sempre que houver auxiliares)
          if (auxiliaresIDs.length) {
            this.enviarMensagemWhatsappParaAuxiliares(auxiliaresIDs, chamado, response.ChamadoID);
          }

          this.carregando = false;
          this.menssagemService.adicionarMensagem('Chamado criado com sucesso!');
          this.router.navigate([`Chamados/Detalhes/Sac/${response.ChamadoID}`]);
        },
        error: (error) => {
          console.error('Erro ao criar chamado:', error);
          this.carregando = false;
        }
      });
    }
  }

  protected enviarMensagemWhatsapp(chamado: IChamadoForm, chamadoID: string): void {
    const usuarioID = CryptoJS.AES.decrypt(
      localStorage.getItem('UsuarioID') || '',
      environment.chavePrivada
    ).toString(CryptoJS.enc.Utf8);

    const criadorID = chamado.UsuarioCriacaoID;
    const responsavelID = chamado.UsuarioResponsavelID;

    const deveEnviarParaResponsavel =
      usuarioID === criadorID && responsavelID !== null;

    const deveEnviarParaCriador =
      usuarioID !== criadorID && responsavelID === null;

    const deveEnviarParaAmbos =
      usuarioID !== criadorID &&
      responsavelID !== null &&
      usuarioID !== responsavelID;

    const linkChamado = `https://work.bebidasprojeto.com.br/Chamados/Detalhes/${chamadoID}`;

    // 🔸 Envia para o responsável
    if (deveEnviarParaResponsavel || deveEnviarParaAmbos) {
      const usuarioDestino = this.usuarios.find(usuario => usuario.UsuarioID === responsavelID);

      if (usuarioDestino) {
        const mensagem: IWhatsappEnvio = {
          Nome: usuarioDestino.Nome,
          Telefone: usuarioDestino.Telefone,
          TemplateId: '1077609287789930',
          BodyParameters: [
            usuarioDestino.Nome,
            'Responsável',
            chamado.Titulo,
            linkChamado
          ]
        };

        this.whatsappService.enviarMensagemWhatsApp(mensagem).subscribe({
          next: () => { },
          error: (err) => console.error('Erro ao enviar para responsável:', err)
        });
      }
    }

    // 🔸 Envia para o criador
    if (usuarioID !== criadorID) {
      const usuarioDestino = this.usuarios.find(usuario => usuario.UsuarioID === criadorID);

      if (usuarioDestino) {
        const mensagem: IWhatsappEnvio = {
          Nome: usuarioDestino.Nome,
          Telefone: usuarioDestino.Telefone,
          TemplateId: '1077609287789930',
          BodyParameters: [
            usuarioDestino.Nome,
            'Solicitante',
            chamado.Titulo,
            linkChamado
          ]
        };

        this.whatsappService.enviarMensagemWhatsApp(mensagem).subscribe({
          next: () => console.log('WhatsApp enviado para criador'),
          error: (err) => console.error('Erro ao enviar para criador:', err)
        });
      }
    }
  }

  protected enviarMensagemWhatsappParaAuxiliares(auxiliaresIDs: string[], chamado: IChamadoForm, chamadoID: string): void {
    const linkChamado = `https://work.bebidasprojeto.com.br/Chamados/Detalhes/${chamadoID}`;

    // evita duplicidade caso algum auxiliar também seja responsável/criador
    const idsUnicos = Array.from(new Set(auxiliaresIDs));

    // resolve usuários no cache de usuários carregados
    const auxiliares = this.usuarios.filter(u => idsUnicos.includes(u.UsuarioID));

    auxiliares.forEach(aux => {
      if (!aux?.Telefone) return;

      const mensagem: IWhatsappEnvio = {
        Nome: aux.Nome,
        Telefone: aux.Telefone,
        TemplateId: '1286878353243538',
        BodyParameters: [
          aux.Nome,
          chamado.Titulo,
          linkChamado
        ]
      };

      this.whatsappService.enviarMensagemWhatsApp(mensagem).subscribe({
        next: () => { },
        error: (err) => console.error('Erro ao enviar WhatsApp para auxiliar:', aux.Nome, err)
      });
    });
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
    this.preview = { aberto: false, src: '', tipo: '', excel: null };
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

  protected getPdfSafeUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.preview.src);
  }

  // ===== Helper comum para adicionar arquivos =====
  private async processFiles(files: File[]) {
    for (const file of files) {
      // salva no IndexedDB (blob real)
      const id = this.uid();
      await this.draftDb.put({
        id,
        draftKey: this.DRAFT_KEY,
        name: file.name,
        type: file.type,
        lastModified: file.lastModified,
        blob: file
      });

      const base64 = await this.readFileAsDataURL(file);
      this.arquivosSelecionados.push({ id, nome: file.name, base64, tipo: file.type });
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
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8 = new Uint8Array(n);
      while (n--) u8[n] = bstr.charCodeAt(n);
      return new File([u8], filename, { type: mime });
    } catch {
      return null;
    }
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
  }

  private restoreDraft(): void {
    /*const raw = sessionStorage.getItem(this.DRAFT_KEY);
    if (!raw) return;

    try {
      const data = JSON.parse(raw);

      // patchValue não reclama de campos faltando
      this.formularioChamado.patchValue(data, { emitEvent: false });

      // ⚠️ se seu fluxo depende de habilitar campos (Servico/Tipo) ao escolher departamento/serviço,
      // chame manualmente a lógica de enable após restaurar:
      const depId = this.formularioChamado.get('DepartamentoResponsavelID')?.value;
      if (depId) {
        this.formularioChamado.get('UsuarioResponsavelID')?.enable({ emitEvent: false });
        this.formularioChamado.get('ServicoID')?.enable({ emitEvent: false });
      }

      const servicoId = this.formularioChamado.get('ServicoID')?.value;
      if (servicoId) {
        this.formularioChamado.get('TipoServicoID')?.enable({ emitEvent: false });
      }
    } catch {
      sessionStorage.removeItem(this.DRAFT_KEY);
    }*/
  }

  private setupDraftAutosave(): void {
    this.formularioChamado.valueChanges.subscribe(() => {
      // getRawValue pega também campos desabilitados
      const rawValue = this.formularioChamado.getRawValue();

      // ⚠️ NÃO recomendo salvar arquivos base64 no sessionStorage (pode estourar limite)
      // Então, se quiser, remova campos grandes:
      // delete rawValue.AlgumaCoisaGrande;

      //sessionStorage.setItem(this.DRAFT_KEY, JSON.stringify(rawValue));
    });
  }

  private async restoreAttachments(): Promise<void> {
    const items = await this.draftDb.listByDraftKey(this.DRAFT_KEY);

    // reconstroi arquivosSelecionados (preview base64)
    this.arquivosSelecionados = [];
    for (const it of items) {
      const base64 = await this.blobToDataURL(it.blob);
      this.arquivosSelecionados.push({ id: it.id, nome: it.name, base64, tipo: it.type });
    }
  }

  private blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private uid(): string {
    return crypto?.randomUUID?.() ?? String(Date.now()) + '-' + Math.random().toString(16).slice(2);
  }

  private async hidratarCombosDoDraft(): Promise<void> {
    const depId = this.formularioChamado.get('DepartamentoResponsavelID')?.value;
    const servicoId = this.formularioChamado.get('ServicoID')?.value;

    // Se tem departamento salvo, habilita e repopula combos dependentes
    if (depId) {
      this.formularioChamado.get('UsuarioResponsavelID')?.enable({ emitEvent: false });
      this.formularioChamado.get('ServicoID')?.enable({ emitEvent: false });

      // repopula listas
      this.servicosPorDepartamento = this.servicos
        .filter(s => s.DepartamentoResponsavelID === depId)
        .sort((a, b) => a.Servico.localeCompare(b.Servico));

      this.usuariosTecnicosPorDepartamento = this.usuariosTecnicos
        .filter(u => u.DepartamentoResponsavelID === depId)
        .sort((a, b) => a.Nome.localeCompare(b.Nome));
    }

    // Se tem serviço salvo, repopula tipos
    if (servicoId) {
      const serv = this.servicos.find(s => s.ServicoID === servicoId);
      this.tiposServico = (serv?.TipoServico ?? [])
        .slice()
        .sort((a, b) => a.TipoServico.localeCompare(b.TipoServico));

      this.formularioChamado.get('TipoServicoID')?.enable({ emitEvent: false });
    }

    // (Opcional, mas recomendado) valida se o Serviço salvo ainda pertence ao dep salvo
    if (depId && servicoId) {
      const pertence = this.servicosPorDepartamento.some(s => s.ServicoID === servicoId);
      if (!pertence) {
        // se não pertence, limpa cascata pra não ficar inconsistente
        this.formularioChamado.patchValue({ ServicoID: '', TipoServicoID: '' }, { emitEvent: false });
        this.tiposServico = [];
        this.formularioChamado.get('TipoServicoID')?.disable({ emitEvent: false });
      }
    }

    // Mesmo raciocínio pro TipoServicoID: se não existir mais, limpa
    const tipoId = this.formularioChamado.get('TipoServicoID')?.value;
    if (tipoId) {
      const ok = this.tiposServico.some(t => t.TipoServicoID === tipoId);
      if (!ok) this.formularioChamado.patchValue({ TipoServicoID: '' }, { emitEvent: false });
    }
  }

  private onDepartamentoChange(departamentoID: string | null): void {
    if (departamentoID) {
      this.formularioChamado.get('UsuarioResponsavelID')?.enable();
      this.formularioChamado.get('ServicoID')?.enable();
      this.formularioChamado.get('AuxiliaresIDs')?.enable(); 

      this.servicosPorDepartamento = this.servicos
        .filter(s => s.DepartamentoResponsavelID === departamentoID)
        .sort((a, b) => a.Servico.localeCompare(b.Servico));

      this.usuariosTecnicosPorDepartamento = this.usuariosTecnicos
        .filter(u => u.DepartamentoResponsavelID === departamentoID)
        .sort((a, b) => a.Nome.localeCompare(b.Nome));
    } else {
      this.formularioChamado.get('UsuarioResponsavelID')?.reset();
      this.formularioChamado.get('UsuarioResponsavelID')?.disable();

      this.formularioChamado.get('ServicoID')?.reset();
      this.formularioChamado.get('ServicoID')?.disable();

      this.formularioChamado.get('TipoServicoID')?.reset();
      this.formularioChamado.get('TipoServicoID')?.disable();

      this.formularioChamado.get('AuxiliaresIDs')?.reset();
      this.formularioChamado.get('AuxiliaresIDs')?.disable();

      this.servicosPorDepartamento = [];
      this.usuariosTecnicosPorDepartamento = [];
      this.tiposServico = [];
    }
  }

  private iniciarDepartamentoFixo(departamentoID: string): void {
    // seta o departamento no form
    this.formularioChamado.get('DepartamentoResponsavelID')?.setValue(departamentoID, { emitEvent: false });

    // prepara combos e habilita campos dependentes
    this.onDepartamentoChange(departamentoID);

    // se quiser limpar dependências ao entrar (opcional)
    this.formularioChamado.patchValue(
      {
        UsuarioResponsavelID: '',
        ServicoID: '',
        TipoServicoID: ''
      },
      { emitEvent: false }
    );

    // Tipo começa desabilitado até escolher serviço
    this.formularioChamado.get('TipoServicoID')?.disable({ emitEvent: false });
    this.tiposServico = [];

    // trava o departamento (mas o valor vai no getRawValue no submit)
    this.formularioChamado.get('DepartamentoResponsavelID')?.disable({ emitEvent: false });
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

  private getLimitForKind(kind: ReturnType<NovoChamadoSacComponent['getPreviewKind']>) {
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
}
