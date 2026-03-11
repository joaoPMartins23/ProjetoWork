import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as CryptoJS from 'crypto-js';

import { IChamadoViewSimples } from 'src/app/modules/chamados/chamado.interface';
import { IDepartamentoResponsavel } from 'src/app/modules/chamados/departamentoResponsavel.interface';
import { IServico } from 'src/app/modules/chamados/service.interface';
import { IUsuarioView } from 'src/app/modules/cruds/cadastros/usuario.interface';
import { ChamadoService } from 'src/app/services/chamados/chamado.service';
import { DepartamentoResponsavelService } from 'src/app/services/chamados/departamentoResponsavel.service';
import { ServicoService } from 'src/app/services/chamados/servico.service';
import { UsuarioService } from 'src/app/services/cruds/cadastros/usuario.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-todos-chamados',
  templateUrl: './todos-chamados.component.html',
  styleUrl: './todos-chamados.component.scss'
})
export class TodosChamadosComponent implements OnInit, OnDestroy {
  protected carregando: boolean = true;
  private intervaloAtualizacao: any;
  private destroyed = false;

  protected paginaAtual: number = 1;
  protected itensPorPagina: number = 15;

  protected usuarioID: string = CryptoJS.AES.decrypt(localStorage.getItem('UsuarioID') || '', environment.chavePrivada).toString(CryptoJS.enc.Utf8);
  protected departamentoResponsavel: string | null = CryptoJS.AES.decrypt(localStorage.getItem('DepartamentoResponsavelID') || '', environment.chavePrivada).toString(CryptoJS.enc.Utf8) || null;
  protected departamentoID: string = CryptoJS.AES.decrypt(localStorage.getItem('DepartamentoID') || '', environment.chavePrivada).toString(CryptoJS.enc.Utf8);
  protected perfilAcessoUsuario: string = CryptoJS.AES.decrypt(localStorage.getItem('PerfilAcesso') || '', environment.chavePrivada).toString(CryptoJS.enc.Utf8);

  protected cabecalhosEnviar: any[] = [
    { CampoTitulo: "Prioridade", CampoChave: "Prioridade" },
    { CampoTitulo: "Assunto", CampoChave: "Assunto" },
    { CampoTitulo: "Solicitante", CampoChave: "Solicitante" },
    { CampoTitulo: "Responsável", CampoChave: "Responsavel" },
    { CampoTitulo: "Serviço", CampoChave: "Servico" },
    { CampoTitulo: "Status", CampoChave: "Status" },
    { CampoTitulo: "Aberto em", CampoChave: "DataAbertura" },
    { CampoTitulo: "Protocolo", CampoChave: "Protocolo" }
  ];

  protected cabecalhosEditadosEnviar: any[] = [
    { CampoTitulo: "Prioridade" },
    { CampoTitulo: "Assunto" },
    { CampoTitulo: "Solicitante" },
    { CampoTitulo: "Responsavel" },
    { CampoTitulo: "Servico" },
    { CampoTitulo: "Status" },
    { CampoTitulo: "DataAbertura" },
    { CampoTitulo: "Protocolo" }
  ];

  protected chamadosEnviar: any[] = [];
  protected todosChamadosUsuario: IChamadoViewSimples[] = [];

  protected usuarios: IUsuarioView[] = [];
  protected servicos: IServico[] = [];
  private departamentosResponsaveis: IDepartamentoResponsavel[] = [];

  protected usuariosDepartamento: IUsuarioView[] = [];

  protected filtroSelecionado: string = 'nao-resolvidos';
  protected termoPesquisa: string = '';
  protected servicoSelecionadoId: string = 'todos';
  protected responsavelSelecionadoId: string = 'todos';
  protected dataInicio: string | null = null; // formato yyyy-MM-dd
  protected dataFim: string | null = null;    // formato yyyy-MM-dd

  protected criterioOrdenacao: { campo: string | null; direcao: 'asc' | 'desc' } = { campo: null, direcao: 'desc' };

  preview = {
    visible: false,
    x: 0,
    y: 0,
    carregando: false,
    data: null as null | (typeof this.chamadosEnviar[number] & { Descricao?: string })
  };

  private previewCache = new Map<string, string>();
  private hideTimer: any = null;

  private hoverTimer: any = null;
  private readonly HOVER_DELAY = 500; // 1000ms = 1 segundo

  private searchTimer: any = null;

  private readonly DIRETORIA_DEPT_IDS = new Set<string>([
    '2EF6482D-231E-47DA-A3B2-C8D5B1DBDBAC',
  ]);

  protected get ehDiretoria(): boolean {
    return this.DIRETORIA_DEPT_IDS.has(this.departamentoID);
  }

  constructor(
    private chamadoService: ChamadoService,
    private usuarioService: UsuarioService,
    private servicoService: ServicoService,
    private departamentoResponsavelService: DepartamentoResponsavelService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) { }

  async ngOnInit(): Promise<void> {
    // Carrega serviços, usuários e departamentos
    this.servicos = await this.servicoService.buscarServicos().toPromise() || [];
    this.usuarios = await this.usuarioService.buscarUsuarios().toPromise() || [];
    this.departamentosResponsaveis = await this.departamentoResponsavelService.buscarDepartamentosResponsaveis().toPromise() || [];

    this.usuariosDepartamento = this.ehDiretoria
      ? this.usuarios
      : this.usuarios.filter(u => u.DepartamentoID === this.departamentoID);

    // Lê filtros e página via queryParams
    this.activatedRoute.queryParams.subscribe(params => {
      if (this.destroyed) return;

      this.filtroSelecionado = params['status'] || 'nao-resolvidos';
      this.servicoSelecionadoId = params['servico'] || 'todos';
      this.termoPesquisa = params['pesquisa'] || '';
      this.responsavelSelecionadoId = params['responsavel'] || 'todos';
      this.dataInicio = params['de'] || null;
      this.dataFim = params['ate'] || null;
    });

    if (this.destroyed) return;

    await this.carregarTodosChamados();
    this.aplicarFiltro();
    this.carregando = false;

    this.activatedRoute.queryParams.subscribe(params => {
      this.paginaAtual = +params['pagina'] || 1;
    });

    // Intervalo de atualização automática
    this.intervaloAtualizacao = setInterval(async () => {
      if (this.destroyed) return;
      this.carregando = true;
      await this.carregarTodosChamados();
      this.aplicarFiltro();
      this.carregando = false;
    }, 180000);
  }

  ngOnDestroy(): void {
    this.destroyed = true; // <--- marca que o componente morreu

    if (this.intervaloAtualizacao) clearInterval(this.intervaloAtualizacao);
  }

  protected async carregarTodosChamados(): Promise<void> {
    const chamados: IChamadoViewSimples[] =
      await this.chamadoService.buscarChamados().toPromise() || [];

    // sempre exclui ClienteID
    const base = chamados.filter(c => !(c as any)?.ClienteID);

    if (this.ehDiretoria) {
      this.todosChamadosUsuario = base;
      return;
    }

    const usuarioMesmoDepartamento = this.usuarios.filter(u => u.DepartamentoID === this.departamentoID);

    this.todosChamadosUsuario = base.filter(chamado => {
      const pertenceAoUsuario =
        chamado.UsuarioCriacaoID === this.usuarioID ||
        chamado.UsuarioResponsavelID === this.usuarioID;

      const pertenceAoDepartamentoResponsavel = this.departamentoResponsavel
        ? chamado.DepartamentoResponsavelID === this.departamentoResponsavel
        : false;

      const pertenceAoDepartamentoUsuario = usuarioMesmoDepartamento.some(u =>
        u.UsuarioID === chamado.UsuarioCriacaoID || u.UsuarioID === chamado.UsuarioResponsavelID
      );

      return pertenceAoUsuario || pertenceAoDepartamentoResponsavel || pertenceAoDepartamentoUsuario;
    });
  }


  protected formatarDataHora(isoString: string): string {
    const data = new Date(isoString);
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const horas = String(data.getHours()).padStart(2, '0');
    const minutos = String(data.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} - ${horas}:${minutos}`;
  }

  protected aplicarFiltro(): void {
    let chamadosFiltrados = [...this.todosChamadosUsuario];

    // 1) Status
    switch (this.filtroSelecionado) {
      case 'em-espera': chamadosFiltrados = chamadosFiltrados.filter(c => c.Status === 'Em espera'); break;
      case 'aguardando-solicitante': chamadosFiltrados = chamadosFiltrados.filter(c => c.Status === 'Aguardando solicitante'); break;
      case 'aguardando-responsavel': chamadosFiltrados = chamadosFiltrados.filter(c => c.Status === 'Aguardando responsável'); break;
      case 'aguardando-parceiro': chamadosFiltrados = chamadosFiltrados.filter(c => c.Status === 'Aguardando parceiro'); break;
      case 'nao-resolvidos': chamadosFiltrados = chamadosFiltrados.filter(c => c.Status !== 'Finalizado' && c.Status !== 'Cancelado'); break;
      case 'resolvidos': chamadosFiltrados = chamadosFiltrados.filter(c => c.Status === 'Finalizado'); break;
      case 'nao-atribuido': chamadosFiltrados = chamadosFiltrados.filter(c => !c.UsuarioResponsavelID); break;
    }

    // 2) Serviço
    if (this.servicoSelecionadoId && this.servicoSelecionadoId !== 'todos') {
      chamadosFiltrados = chamadosFiltrados.filter(c => c.ServicoID === this.servicoSelecionadoId);
    }

    // 3) Responsável
    if (this.responsavelSelecionadoId && this.responsavelSelecionadoId !== 'todos') {
      chamadosFiltrados = chamadosFiltrados.filter(c => c.UsuarioResponsavelID === this.responsavelSelecionadoId);
    }

    // 5) Data (intervalo inclusivo)
    if (this.dataInicio || this.dataFim) {
      const inicio = this.dataInicio ? this.toStartOfDay(this.dataInicio) : null;
      const fim = this.dataFim ? this.toEndOfDay(this.dataFim) : null;

      chamadosFiltrados = chamadosFiltrados.filter(c => {
        const t = new Date(c.DataHora).getTime();
        if (inicio && t < inicio) return false;
        if (fim && t > fim) return false;
        return true;
      });
    }

    // 6) Pesquisa
    // 6) Pesquisa (global em vários campos)
    const termo = this.norm(this.termoPesquisa);
    if (termo) {
      chamadosFiltrados = chamadosFiltrados.filter(c => {
        const servico = this.servicos.find(s => s.ServicoID === c.ServicoID)?.Servico || '';
        const solicitante = this.usuarios.find(u => u.UsuarioID === c.UsuarioCriacaoID)?.Nome || '';
        const responsavel = this.usuarios.find(u => u.UsuarioID === c.UsuarioResponsavelID)?.Nome || 'Não atribuído';
        const departamento = this.departamentosResponsaveis.find(dep => dep.DepartamentoResponsavelID === c.DepartamentoResponsavelID)?.DepartamentoResponsavel || '';
        const dataAbertura = this.formatarDataHora(c.DataHora);

        const campos = [
          c.Protocolo,
          c.Titulo,
          servico,
          solicitante,
          responsavel,
          departamento,
          c.Status,
          c.Prioridade,
          dataAbertura
        ];

        return campos.some(v => this.norm(v).includes(termo));
      });
    }


    // 7) Ordenação padrão
    if (!this.criterioOrdenacao.campo) {
      chamadosFiltrados = this.ordenarPadrao(chamadosFiltrados);
    }

    // 8) Mapeia para exibição
    let enviados = chamadosFiltrados.map(chamado => ({
      Protocolo: chamado.Protocolo,
      Assunto: chamado.Titulo,
      DataAbertura: this.formatarDataHora(chamado.DataHora),
      Solicitante: this.usuarios.find(u => u.UsuarioID === chamado.UsuarioCriacaoID)?.Nome || 'Desconhecido',
      Responsavel: this.usuarios.find(u => u.UsuarioID === chamado.UsuarioResponsavelID)?.Nome || 'Não atribuído',
      Departamento: this.departamentosResponsaveis.find(dep => dep.DepartamentoResponsavelID === chamado.DepartamentoResponsavelID)?.DepartamentoResponsavel || 'Desconhecido',
      Servico: this.servicos.find(s => s.ServicoID === chamado.ServicoID)?.Servico || 'Desconhecido',
      Prioridade: chamado.Prioridade,
      Status: chamado.Status,
      ID: chamado.ChamadoID,
    }));

    // 9) Ordenação por coluna
    if (this.criterioOrdenacao.campo) {
      const campo = this.criterioOrdenacao.campo;
      const dir = this.criterioOrdenacao.direcao;
      enviados = [...enviados].sort((a: any, b: any) => {
        const comp = this.compararValores(a[campo], b[campo], campo);
        return dir === 'asc' ? comp : -comp;
      });
    }

    this.chamadosEnviar = enviados;

    // 10) Persistir filtros nos query params (inclui novos)
    if (!this.destroyed) {
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: {
          status: this.filtroSelecionado,
          servico: this.servicoSelecionadoId,
          pesquisa: this.termoPesquisa,
          responsavel: this.responsavelSelecionadoId,
          de: this.dataInicio || null,
          ate: this.dataFim || null
        },
        queryParamsHandling: 'merge'
      });
    }
  }

  private ordenarPadrao(chamados: IChamadoViewSimples[]): IChamadoViewSimples[] {
    return [...chamados].sort((a, b) => new Date(b.DataHora).getTime() - new Date(a.DataHora).getTime());
  }

  ordenarPor(campo: string): void {
    if (this.criterioOrdenacao.campo === campo) {
      this.criterioOrdenacao.direcao = this.criterioOrdenacao.direcao === 'asc' ? 'desc' : 'asc';
    } else {
      this.criterioOrdenacao.campo = campo;
      this.criterioOrdenacao.direcao = campo === 'Prioridade' ? 'desc' : 'asc';
    }
    this.aplicarFiltro();
  }

  private parseDataBR(dataStr: string): number {
    const [parteData, parteHora] = (dataStr || '').split(' - ');
    if (!parteData) return 0;
    const [dia, mes, ano] = parteData.split('/').map(Number);
    const [hora, minuto] = (parteHora || '00:00').split(':').map(Number);
    return new Date(ano, (mes || 1) - 1, dia || 1, hora || 0, minuto || 0).getTime();
  }

  private compararValores(a: any, b: any, campo: string): number {
    if (campo === 'DataAbertura') return this.parseDataBR(a || '') - this.parseDataBR(b || '');
    if (campo === 'Prioridade') {
      const rank: Record<string, number> = { 'Alta': 3, 'Média': 2, 'Baixa': 1 };
      return (rank[a] || 0) - (rank[b] || 0);
    }
    const sa = (a ?? '').toString().toLowerCase();
    const sb = (b ?? '').toString().toLowerCase();
    return sa.localeCompare(sb, 'pt-BR');
  }

  protected onChangeServico(): void {
    this.aplicarFiltro();
  }

  protected statusClassMap: Record<string, string> = {
    'Em espera': 'badge-status--espera',
    'Em atendimento': 'badge-status--andamento',
    'Finalizado': 'badge-status--finalizado',
    'Cancelado': 'badge-status--cancelado',
    'Aberto': 'badge-status--aberto',
    'Aguardando solicitante': 'badge-status--aguardando',
    'Aguardando responsável': 'badge-status--aguardando',
    'Aguardando parceiro': 'badge-status--aguardando'
  };

  protected statusIconMap: Record<string, string> = {
    'Em espera': 'fa-clock',
    'Em atendimento': 'fa-spinner',
    'Finalizado': 'fa-check',
    'Cancelado': 'fa-times',
    'Aberto': 'fa-circle',
    'Aguardando solicitante': 'fa-pause',
    'Aguardando responsável': 'fa-pause',
    'Aguardando parceiro': 'fa-pause'
  };

  protected rowClassMap: Record<string, string> = {
    'Em espera': 'row--status-espera',
    'Em atendimento': 'row--status-andamento',
    'Finalizado': 'row--status-finalizado',
    'Cancelado': 'row--status-cancelado',
    'Aberto': 'row--status-aberto',
    'Aguardando solicitante': 'row-status--aguardando',
    'Aguardando responsável': 'row-status--aguardando',
    'Aguardando parceiro': 'row-status--aguardando'
  };

  onRowEnter(ev: MouseEvent, linha: any): void {
    // Limpa qualquer timer anterior
    clearTimeout(this.hoverTimer);

    // Cria um timer para mostrar o hover após 1 segundo
    this.hoverTimer = setTimeout(() => {
      this.preview.visible = true;
      this.updatePreviewPos(ev);

      // Preenche dados básicos que já temos
      this.preview.data = { ...linha, Descricao: this.previewCache.get(linha.ID) || '' };
      this.preview.carregando = !this.previewCache.has(linha.ID);

      // Se ainda não temos a primeira mensagem, busca e cacheia
      if (!this.previewCache.has(linha.ID)) {
        this.buscarPrimeiraMensagem(linha.ID)
          .then(texto => {
            this.previewCache.set(linha.ID, texto || '');
            if (this.preview.visible && this.preview.data?.ID === linha.ID) {
              this.preview.data = { ...this.preview.data, Descricao: texto || '' };
              this.preview.carregando = false;
            }
          })
          .catch(() => {
            if (this.preview.visible && this.preview.data?.ID === linha.ID) {
              this.preview.carregando = false;
            }
          });
      }
    }, this.HOVER_DELAY);
  }

  onRowLeave(): void {
    // Limpa o timer para não mostrar o hover se o mouse sair antes do delay
    clearTimeout(this.hoverTimer);

    // Oculta imediatamente
    this.preview.visible = false;
  }

  private updatePreviewPos(ev: MouseEvent): void {
    const PADDING = 12, CARD_W = 520, CARD_H = 220;
    let x = ev.clientX + 16, y = ev.clientY + 16;

    if (x + CARD_W > window.innerWidth) x = ev.clientX - CARD_W - 16;
    if (y + CARD_H > window.innerHeight) y = window.innerHeight - CARD_H - PADDING;

    this.preview.x = Math.max(PADDING, x);
    this.preview.y = Math.max(PADDING, y);
  }

  private async buscarPrimeiraMensagem(chamadoId: string): Promise<string> {
    const detalhado: any = await this.chamadoService.buscarChamado(chamadoId).toPromise();
    const mensagens = detalhado?.Mensagens || detalhado?.mensagens || [];
    if (!Array.isArray(mensagens) || mensagens.length === 0) return '';

    const sorted = [...mensagens].sort((a, b) => {
      const da = new Date(a.DataHoraInicio || a.DataHora || a.dataHora).getTime();
      const db = new Date(b.DataHoraInicio || b.DataHora || b.dataHora).getTime();
      return da - db;
    });

    const primeira = sorted[0] || {};
    return (primeira.Mensagem || primeira.Texto || primeira.Descricao || '').toString();
  }

  protected onPaginaChange(novaPagina: number): void {
    this.paginaAtual = novaPagina;

    if (this.destroyed) return;

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {
        pagina: this.paginaAtual
      },
      queryParamsHandling: 'merge'
    });
  }

  private toStartOfDay(yyyyMMdd: string): number {
    const [y, m, d] = yyyyMMdd.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0).getTime();
  }

  private toEndOfDay(yyyyMMdd: string): number {
    const [y, m, d] = yyyyMMdd.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999).getTime();
  }

  onPesquisarTermo(valor: string): void {
    this.termoPesquisa = valor || '';
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.paginaAtual = 1;
      this.aplicarFiltro();
      // atualiza query param de pesquisa
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: { pesquisa: this.termoPesquisa || null, pagina: 1 },
        queryParamsHandling: 'merge'
      });
    }, 250);
  }

  limparPesquisa(): void {
    this.onPesquisarTermo('');
  }

  /** Remove acentos e baixa caixa p/ comparação */
  private norm(s: any): string {
    return (s ?? '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  limparTodosFiltros(): void {
    // valores padrão
    this.filtroSelecionado = 'nao-resolvidos'; // ou 'todos' se preferir
    this.servicoSelecionadoId = 'todos';
    this.responsavelSelecionadoId = 'todos';
    this.dataInicio = null;
    this.dataFim = null;
    this.termoPesquisa = '';
    this.paginaAtual = 1;

    // aplica e remove os query params
    this.aplicarFiltro();

    if (this.destroyed) return;

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {
        status: this.filtroSelecionado,
        servico: null,
        responsavel: null,
        pesquisa: null,
        de: null,
        ate: null,
        pagina: 1
      },
      queryParamsHandling: 'merge'
    });
  }
}
