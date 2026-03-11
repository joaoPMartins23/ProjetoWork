import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as CryptoJS from 'crypto-js';

import { environment } from 'src/environments/environment';
import { ChamadoRecorrenteService } from 'src/app/services/chamados/chamadoRecorrente.service';
import { IChamadoRecorrenteView } from 'src/app/modules/chamados/chamadoRecorrente.interface';

import { IDepartamentoResponsavel } from 'src/app/modules/chamados/departamentoResponsavel.interface';
import { IServico } from 'src/app/modules/chamados/service.interface';
import { IUsuarioView } from 'src/app/modules/cruds/cadastros/usuario.interface';

import { DepartamentoResponsavelService } from 'src/app/services/chamados/departamentoResponsavel.service';
import { ServicoService } from 'src/app/services/chamados/servico.service';
import { UsuarioService } from 'src/app/services/cruds/cadastros/usuario.service';

@Component({
  selector: 'app-todos-chamados-recorrentes',
  templateUrl: './todos-chamados-recorrentes.component.html',
  styleUrls: ['./todos-chamados-recorrentes.component.scss']
})
export class TodosChamadosRecorrentesComponent implements OnInit, OnDestroy {
  protected carregando = true;
  private intervaloAtualizacao: any;

  protected paginaAtual = 1;
  protected itensPorPagina = 15;

  protected usuarioID: string = CryptoJS.AES.decrypt(localStorage.getItem('UsuarioID') || '', environment.chavePrivada).toString(CryptoJS.enc.Utf8);

  /** Cabeçalhos de exibição (padrão da sua tabela) */
  protected cabecalhosEnviar: any[] = [
    { CampoTitulo: "Ativo", CampoChave: "Ativo" },
    { CampoTitulo: "Prioridade", CampoChave: "Prioridade" },
    { CampoTitulo: "Assunto", CampoChave: "Assunto" },
    { CampoTitulo: "Responsavel", CampoChave: "Responsavel" },
    { CampoTitulo: "Servico", CampoChave: "Servico" },
    { CampoTitulo: "Frequencia", CampoChave: "Frequencia" },
    { CampoTitulo: "Periodo", CampoChave: "Periodo" },
    { CampoTitulo: "DataInicio", CampoChave: "DataInicio" },
    { CampoTitulo: "DataFim", CampoChave: "DataFim" },
    { CampoTitulo: "ProximaOcorrencia", CampoChave: "ProximaOcorrencia" }
  ];
  protected cabecalhosEditadosEnviar: any[] = this.cabecalhosEnviar.map(x => ({ CampoTitulo: x.CampoTitulo }));

  /** Array original do backend */
  private todosRecorrentes: IChamadoRecorrenteView[] = [];

  /** Array preparado para exibição na tabela */
  protected chamadosEnviar: any[] = [];

  /** Dimensões auxiliares */
  protected servicos: IServico[] = [];
  protected usuarios: IUsuarioView[] = [];
  protected departamentosResponsaveis: IDepartamentoResponsavel[] = [];

  /** Filtros */
  protected filtroStatus: 'todos' | 'ativos' | 'inativos' = 'todos';
  protected termoPesquisa = '';
  protected servicoSelecionadoId: string = 'todos';

  /** Ordenação */
  protected criterioOrdenacao: { campo: string | null; direcao: 'asc' | 'desc' } = { campo: null, direcao: 'asc' };

  /** Hover Preview */
  preview = {
    visible: false,
    x: 0,
    y: 0,
    data: null as null | any
  };

  private hoverTimer: any = null;
  private readonly HOVER_DELAY = 400;

  constructor(
    private recorrenteService: ChamadoRecorrenteService,
    private usuarioService: UsuarioService,
    private servicoService: ServicoService,
    private departamentoService: DepartamentoResponsavelService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  async ngOnInit(): Promise<void> {
    try {
      // dimensões
      this.servicos = (await this.servicoService.buscarServicos().toPromise()) || [];
      this.usuarios = (await this.usuarioService.buscarUsuarios().toPromise()) || [];
      this.departamentosResponsaveis = (await this.departamentoService.buscarDepartamentosResponsaveis().toPromise()) || [];

      // ler filtros via query
      this.route.queryParams.subscribe(params => {
        this.filtroStatus = (params['status'] as any) || 'todos';
        this.servicoSelecionadoId = params['servico'] || 'todos';
        this.termoPesquisa = params['pesquisa'] || '';
      });

      await this.carregar();
      this.aplicarFiltro();
      this.carregando = false;

      // pagina via query
      this.route.queryParams.subscribe(params => {
        this.paginaAtual = +params['pagina'] || 1;
      });

      // auto refresh (opcional)
      this.intervaloAtualizacao = setInterval(async () => {
        this.carregando = true;
        await this.carregar();
        this.aplicarFiltro();
        this.carregando = false;
      }, 180000);
    } catch (e) {
      console.error(e);
      this.carregando = false;
    }
  }

  ngOnDestroy(): void {
    if (this.intervaloAtualizacao) clearInterval(this.intervaloAtualizacao);
  }

  private async carregar(): Promise<void> {
    this.todosRecorrentes = (await this.recorrenteService.buscarChamadosRecorrentes().toPromise()) || [];

    this.todosRecorrentes = this.todosRecorrentes.filter(ch => ch.UsuarioCriacaoID === this.usuarioID || ch.UsuarioResponsavelID === this.usuarioID);
  }

  /** === Preparação/Exibição === */

  protected aplicarFiltro(): void {
    let lista = [...this.todosRecorrentes];

    // status
    if (this.filtroStatus === 'ativos') lista = lista.filter(x => x.Ativo);
    if (this.filtroStatus === 'inativos') lista = lista.filter(x => !x.Ativo);

    // por serviço
    if (this.servicoSelecionadoId && this.servicoSelecionadoId !== 'todos') {
      lista = lista.filter(x => x.ServicoID === this.servicoSelecionadoId);
    }

    // pesquisa (assunto, serviço, solicitante, responsável)
    const termo = (this.termoPesquisa || '').toLowerCase().trim();
    if (termo) {
      lista = lista.filter(x => {
        const servico = this.servicos.find(s => s.ServicoID === x.ServicoID)?.Servico || '';
        const solicitante = this.usuarios.find(u => u.UsuarioID === x.UsuarioCriacaoID)?.Nome || '';
        const responsavel = this.usuarios.find(u => u.UsuarioID === x.UsuarioResponsavelID)?.Nome || 'Não atribuído';
        return (
          x.Titulo.toLowerCase().includes(termo) ||
          servico.toLowerCase().includes(termo) ||
          solicitante.toLowerCase().includes(termo) ||
          responsavel.toLowerCase().includes(termo) ||
          x.Frequencia.toLowerCase().includes(termo) ||
          x.Periodo.toLowerCase().includes(termo)
        );
      });
    }

    // map para exibição
    const agora = new Date();
    let enviados = lista.map(x => {
      const responsavel = this.usuarios.find(u => u.UsuarioID === x.UsuarioResponsavelID)?.Nome || 'Não atribuído';
      const servico = this.servicos.find(s => s.ServicoID === x.ServicoID)?.Servico || '—';
      const prox = this.calcularProximaOcorrencia(x, agora);

      return {
        Ativo: x.Ativo ? 'Sim' : 'Não',
        Prioridade: x.Prioridade,
        Assunto: x.Titulo,
        Responsavel: responsavel,
        Servico: servico,
        Frequencia: x.Frequencia,
        Periodo: x.Periodo,
        DataInicio: this.formatarDataHora(x.DataInicio),
        DataFim: x.DataFim ? this.formatarDataHora(x.DataFim) : '—',
        ProximaOcorrencia: prox ? this.formatarDataHora(prox.toISOString()) : '—',
        ID: x.ChamadoRecorrenteID,

        // para hover
        __raw: x
      };
    });

    // ordenação padrão (por Próxima Ocorrência asc; se vazio vai pro fim)
    if (!this.criterioOrdenacao.campo) {
      enviados = enviados.sort((a, b) => {
        const ta = a.ProximaOcorrencia === '—' ? Number.MAX_SAFE_INTEGER : this.parseDataBR(a.ProximaOcorrencia);
        const tb = b.ProximaOcorrencia === '—' ? Number.MAX_SAFE_INTEGER : this.parseDataBR(b.ProximaOcorrencia);
        return ta - tb;
      });
    } else {
      const campo = this.criterioOrdenacao.campo;
      const dir = this.criterioOrdenacao.direcao;
      enviados = enviados.sort((a: any, b: any) => {
        const comp = this.compararValores(a[campo], b[campo], campo);
        return dir === 'asc' ? comp : -comp;
      });
    }

    this.chamadosEnviar = enviados;

    // persiste filtros na URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        status: this.filtroStatus,
        servico: this.servicoSelecionadoId,
        pesquisa: this.termoPesquisa
      },
      queryParamsHandling: 'merge'
    });
  }

  ordenarPor(campo: string): void {
    if (this.criterioOrdenacao.campo === campo) {
      this.criterioOrdenacao.direcao = this.criterioOrdenacao.direcao === 'asc' ? 'desc' : 'asc';
    } else {
      this.criterioOrdenacao.campo = campo;
      this.criterioOrdenacao.direcao = 'asc';
    }
    this.aplicarFiltro();
  }

  protected onChangeServico(): void {
    this.aplicarFiltro();
  }

  protected onPaginaChange(n: number): void {
    this.paginaAtual = n;
    this.router.navigate([], { relativeTo: this.route, queryParams: { pagina: n }, queryParamsHandling: 'merge' });
  }

  /** === Hover Preview === */
  onRowEnter(ev: MouseEvent, linha: any): void {
    clearTimeout(this.hoverTimer);
    this.hoverTimer = setTimeout(() => {
      this.preview.visible = true;
      this.updatePreviewPos(ev);
      const r = linha.__raw as IChamadoRecorrenteView;
      this.preview.data = this.montarHoverData(r, linha);
    }, this.HOVER_DELAY);
  }
  onRowLeave(): void {
    clearTimeout(this.hoverTimer);
    this.preview.visible = false;
  }
  private updatePreviewPos(ev: MouseEvent) {
    const PADDING = 12, CARD_W = 520, CARD_H = 260;
    let x = ev.clientX + 16, y = ev.clientY + 16;
    if (x + CARD_W > window.innerWidth) x = ev.clientX - CARD_W - 16;
    if (y + CARD_H > window.innerHeight) y = window.innerHeight - CARD_H - PADDING;
    this.preview.x = Math.max(PADDING, x);
    this.preview.y = Math.max(PADDING, y);
  }

  private montarHoverData(r: IChamadoRecorrenteView, linha: any) {
    const solicitante = this.usuarios.find(u => u.UsuarioID === r.UsuarioCriacaoID)?.Nome || '';
    const responsavel = this.usuarios.find(u => u.UsuarioID === r.UsuarioResponsavelID)?.Nome || 'Não atribuído';
    const servico = this.servicos.find(s => s.ServicoID === r.ServicoID)?.Servico || '—';
    const dep = this.departamentosResponsaveis.find(d => d.DepartamentoResponsavelID === r.DepartamentoResponsavelID)?.DepartamentoResponsavel || '—';
    return {
      Assunto: r.Titulo,
      Solicitante: solicitante,
      Responsavel: responsavel,
      Departamento: dep,
      Servico: servico,
      Frequencia: r.Frequencia,
      Periodo: r.Periodo,
      DataInicio: this.formatarDataHora(r.DataInicio),
      DataFim: r.DataFim ? this.formatarDataHora(r.DataFim) : '—',
      DiasSemana: this.formatarDiasSemana(r),
      DiaMes: r.DiaDoMes ?? '—',
      MesAno: r.MesDoAno ?? '—',
      Proxima: linha.ProximaOcorrencia
    };
  }

  /** === Helpers === */

  protected formatarDataHora(iso: string): string {
    // espera string ISO
    const d = new Date(iso);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} - ${hh}:${mm}`;
  }

  private parseDataBR(str: string): number {
    if (!str || str === '—') return Number.MAX_SAFE_INTEGER;
    const [data, hora] = str.split(' - ');
    const [dd, mm, yyyy] = (data || '').split('/').map(Number);
    const [HH, MM] = (hora || '00:00').split(':').map(Number);
    return new Date(yyyy, (mm || 1) - 1, dd || 1, HH || 0, MM || 0).getTime();
  }

  private compararValores(a: any, b: any, campo: string): number {
    if (campo === 'DataInicio' || campo === 'DataFim' || campo === 'ProximaOcorrencia') {
      return this.parseDataBR(a) - this.parseDataBR(b);
    }
    if (campo === 'Prioridade') {
      const rank: Record<string, number> = { 'Urgente': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 };
      return (rank[a] || 0) - (rank[b] || 0);
    }
    if (campo === 'Ativo') {
      const ra: Record<string, number> = { 'Sim': 1, 'Não': 0 };
      return (ra[a] ?? -1) - (ra[b] ?? -1);
    }
    const sa = (a ?? '').toString().toLowerCase();
    const sb = (b ?? '').toString().toLowerCase();
    return sa.localeCompare(sb, 'pt-BR');
  }

  private formatarDiasSemana(r: IChamadoRecorrenteView): string {
    const map = [
      { k: 'Dom', v: r.Dom, n: 'Dom' },
      { k: 'Seg', v: r.Seg, n: 'Seg' },
      { k: 'Ter', v: r.Ter, n: 'Ter' },
      { k: 'Qua', v: r.Qua, n: 'Qua' },
      { k: 'Qui', v: r.Qui, n: 'Qui' },
      { k: 'Sex', v: r.Sex, n: 'Sex' },
      { k: 'Sab', v: r.Sab, n: 'Sáb' }
    ];
    const escolhidos = map.filter(x => x.v).map(x => x.n);
    return escolhidos.length ? escolhidos.join(', ') : '—';
  }

  /** Calcula próxima ocorrência >= agora, respeitando DataInicio/DataFim e regra */
  private calcularProximaOcorrencia(r: IChamadoRecorrenteView, base: Date): Date | null {
    if (!r.Ativo) return null;

    const inicio = new Date(r.DataInicio);
    const fim = r.DataFim ? new Date(r.DataFim) : null;

    // se já terminou
    if (fim && base > fim) return null;

    // ponto de partida (máx entre agora e início)
    const ref = new Date(Math.max(base.getTime(), inicio.getTime()));

    // normaliza segundos
    ref.setSeconds(0, 0);

    switch (r.Frequencia) {
      case 'DIARIA': {
        const d = new Date(ref);
        if (d < inicio) return inicio;
        return d; // diariamente no horário de DataInicio
      }

      case 'SEMANAL': {
        // mapa: 0=Dom,..6=Sáb
        const dias = [
          r.Dom, r.Seg, r.Ter, r.Qua, r.Qui, r.Sex, r.Sab
        ];
        // percorre até 14 dias pra frente procurando um marcado
        for (let i = 0; i < 14; i++) {
          const d = new Date(ref);
          d.setDate(ref.getDate() + i);
          d.setHours(new Date(r.DataInicio).getHours(), new Date(r.DataInicio).getMinutes(), 0, 0);
          const wd = d.getDay(); // 0..6
          if (dias[wd]) {
            if (d < inicio) continue;
            if (fim && d > fim) return null;
            return d;
          }
        }
        return null;
      }

      case 'MENSAL': {
        const hora = new Date(r.DataInicio).getHours();
        const min = new Date(r.DataInicio).getMinutes();
        const dia = r.DiaDoMes ?? 1;
        // tenta no mês atual e no próximo
        for (let k = 0; k < 2; k++) {
          const d = new Date(ref.getFullYear(), ref.getMonth() + k, dia, hora, min, 0, 0);
          if (d < inicio) continue;
          if (fim && d > fim) continue;
          if (d >= ref) return d;
        }
        return null;
      }

      case 'ANUAL': {
        const hora = new Date(r.DataInicio).getHours();
        const min = new Date(r.DataInicio).getMinutes();
        const dia = r.DiaDoMes ?? 1;
        const mesIdx = (r.MesDoAno ? r.MesDoAno - 1 : 0);
        // tenta neste ano e no próximo
        for (let y = 0; y <= 1; y++) {
          const year = ref.getFullYear() + y;
          const d = new Date(year, mesIdx, dia, hora, min, 0, 0);
          if (d < inicio) continue;
          if (fim && d > fim) continue;
          if (d >= ref) return d;
        }
        return null;
      }
    }
    return null;
  }

  limparTodosFiltros(): void {
    // valores padrão

    this.termoPesquisa = '';
    this.paginaAtual = 1;

    // aplica e remove os query params
    this.aplicarFiltro();
  }
}
