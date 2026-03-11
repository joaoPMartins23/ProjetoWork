import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, timer, firstValueFrom } from 'rxjs';
import * as CryptoJS from 'crypto-js';
import { Router } from '@angular/router';

import { ChamadoService } from 'src/app/services/chamados/chamado.service';
import { UsuarioService } from 'src/app/services/cruds/cadastros/usuario.service';
import { IChamadoViewSimples } from 'src/app/modules/chamados/chamado.interface';
import { IUsuarioView } from 'src/app/modules/cruds/cadastros/usuario.interface';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  carregando = true;

  private refreshSub = new Subscription();
  private readonly REFRESH_MS = 5 * 60 * 1000; // 5 minutos

  // retry
  private readonly MAX_RETRIES = 3;

  // usuário atual
  usuarioID = '';
  perfil = 'Usuário';
  departamentoID = '';
  depRespID: string | null = null;

  // dados base
  usuarios: IUsuarioView[] = [];
  chamados: IChamadoViewSimples[] = [];

  // derivados (UI)
  kpis = {
    meusAbertos: 0,
    deptoAbertos: 0,
    minhaRespAbertos: 0,
    equipeAbertos: 0,
    naoAtribuidosDR: 0,
  };

  statusChips: { nome: string; qtd: number }[] = [];

  ultimosMeus: IChamadoViewSimples[] = [];
  ultimosDepto: IChamadoViewSimples[] = [];
  meusEmAtendimento: IChamadoViewSimples[] = [];
  filaEquipe: IChamadoViewSimples[] = [];
  equipeEmAtendimento: IChamadoViewSimples[] = [];
  naoAtribuidosLista: IChamadoViewSimples[] = [];

  // mapas para UI
  statusIconMap: Record<string, string> = {
    'Em espera': 'fa-clock',
    'Em atendimento': 'fa-spinner',
    'Aguardando solicitante': 'fa-user-clock',
    'Aguardando responsável': 'fa-user',
    'Aguardando parceiro': 'fa-handshake-o',
    'Finalizado': 'fa-check',
    'Cancelado': 'fa-times',
    'Aberto': 'fa-circle',
  };

  // barra de filtros
  filtro: { status: string; usuarioId: string | null; dataIni: string; dataFim: string } = {
    status: 'Não finalizados',
    usuarioId: null,
    dataIni: '',
    dataFim: ''
  };

  statusOptions = [
    { label: 'Não finalizados', value: 'nao-resolvidos' }, // sentinela
    { label: 'Todos', value: 'Todos' },                    // (se quiser exibir todos)
    { label: 'Aberto', value: 'Aberto' },
    { label: 'Em atendimento', value: 'Em atendimento' },
    { label: 'Em espera', value: 'Em espera' },
    { label: 'Aguardando solicitante', value: 'Aguardando solicitante' },
    { label: 'Aguardando responsável', value: 'Aguardando responsável' },
    { label: 'Aguardando parceiro', value: 'Aguardando parceiro' },
    { label: 'Finalizado', value: 'Finalizado' },
    { label: 'Cancelado', value: 'Cancelado' },
  ];

  opcoesStatus = [
    'Não finalizados', 
    'Todos',
    'Aberto',
    'Em atendimento',
    'Em espera',
    'Aguardando solicitante',
    'Aguardando responsável',
    'Aguardando parceiro',
    'Finalizado',
    'Cancelado',
  ];

  get ehAdmin(): boolean {
    return this.perfil === 'Administrador' || this.perfil === 'SuperAdministrador';
  }

  get usuariosDepto(): IUsuarioView[] {
    return this.ehDiretoria
      ? this.usuarios
      : this.usuarios.filter(u => u.DepartamentoID === this.departamentoID);
  }

  get ehTecnico(): boolean {
    return this.perfil !== 'Usuário'; // Técnico ou Administrador
  }

  // média da avaliação por integrante (apenas quem tem pelo menos 1 nota)
  mediasEquipe: Array<{
    usuarioId: string;
    nome: string;
    qtd: number;
    media: number; // 1..5
  }> = [];

  private readonly labelToScore: Record<string, number> = {
    'Péssimo': 1,
    'Ruim': 2,
    'Regular': 3,
    'Bom': 4,
    'Excelente': 5,
  };

  mediaGeralEquipe: { qtd: number; media: number } = { qtd: 0, media: 0 };

  // ranking por quantidade de chamados resolvidos (finalizados) por responsável da equipe
  rankingResolvidosEquipe: Array<{
    usuarioId: string;
    nome: string;
    resolvidos: number;
  }> = [];

  // helper visual pra medalhas
  medalClass(idx: number): 'gold' | 'silver' | 'bronze' | undefined {
    return idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : undefined;
  }

  // média de tempo de resolução (minutos úteis) por integrante da equipe
  avgResolucaoEquipe: Array<{
    usuarioId: string;
    nome: string;
    qtd: number;
    mediaMin: number;  // média em minutos úteis
    mediaFmt: string;  // "Xd Yh Zm"
  }> = [];

  meusKpis = {
    mediaAvaliacaoFmt: '—',
    tempoMedioFmt: '—',
    meuRank: null as number | null,
  };

  // 1) Helpers de data (adicione no class HomeComponent)

  private toInputDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`; // formato aceito pelo <input type="date">
  }

  private setDefaultDateRangeToCurrentMonth(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    this.filtro.dataIni = this.toInputDate(firstDay);
    this.filtro.dataFim = this.toInputDate(now);
  }

  /** IDs de usuários que não devem aparecer/contabilizar no dashboard */
  private readonly EXCLUIDOS = new Set<string>([
    '22E7E9C0-2C0D-4677-99F9-58F7BB9F9150'
  ]);

  /** helper */
  protected isExcluido(id?: string | null): boolean {
    return !!id && this.EXCLUIDOS.has(id);
  }

  public chamadosFiltrados: IChamadoViewSimples[] = [];

  constructor(
    private chamadoService: ChamadoService,
    private usuarioService: UsuarioService,
    private router: Router,
  ) { }

  private readonly DIRETORIA_DEPT_IDS = new Set<string>([
    '2EF6482D-231E-47DA-A3B2-C8D5B1DBDBAC',
    // 'ID-DO-DEPARTAMENTO-DIRETORIA-2',
  ]);

  protected get ehDiretoria(): boolean {
    return this.DIRETORIA_DEPT_IDS.has(this.departamentoID);
  }

  async ngOnInit(): Promise<void> {
    this.carregando = true;

    // contexto local
    this.usuarioID = this.dec(localStorage.getItem('UsuarioID') || '');
    this.perfil = this.dec(localStorage.getItem('PerfilAcesso') || '') || 'Usuário';
    this.departamentoID = this.dec(localStorage.getItem('DepartamentoID') || '');
    const depResp = this.dec(localStorage.getItem('DepartamentoResponsavelID') || '');
    this.depRespID = depResp || null;

    // >>> define o intervalo padrão (1º dia do mês até hoje)
    this.setDefaultDateRangeToCurrentMonth();

    window.addEventListener('focus', this.onWindowFocus);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    try {
      await this.carregarComRetry();
      this.aplicarFiltros();
      this.montarVisao();
      this.scheduleAutoRefresh();
      this.calcularMediasEquipe();
      this.calcularRankingResolvidosEquipe();
      this.calcularTempoMedioResolucaoEquipe();
      this.atualizarKpisPessoaisFromArrays();
    } finally {
      this.carregando = false;
    }
  }

  ngOnDestroy(): void {
    this.refreshSub.unsubscribe();
    window.removeEventListener('focus', this.onWindowFocus);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  // ---------- retry / boot robusto ----------
  private sleep(ms: number) {
    return new Promise(res => setTimeout(res, ms));
  }

  private async carregarDadosBase(): Promise<void> {
    const [usuarios, chamados] = await Promise.all([
      firstValueFrom(this.usuarioService.buscarUsuarios()),
      firstValueFrom(this.chamadoService.buscarChamados()),
    ]);
    this.usuarios = usuarios || [];
    this.chamados = chamados || [];
  }

  private async carregarComRetry(): Promise<void> {
    let delay = 800; // ms
    for (let tentativa = 1; tentativa <= this.MAX_RETRIES; tentativa++) {
      try {
        await this.carregarDadosBase();
        return;
      } catch (err) {
        if (tentativa === this.MAX_RETRIES) throw err;
        await this.sleep(delay);
        delay = Math.round(delay * 1.6); // backoff exponencial leve
      }
    }
  }

  // ---------- auto refresh + retorno de foco ----------
  private scheduleAutoRefresh(): void {
    this.refreshSub.add(
      timer(this.REFRESH_MS, this.REFRESH_MS).subscribe(() => this.refreshDataSilently())
    );
  }

  private onWindowFocus = () => this.refreshDataSilently();
  private onVisibilityChange = () => {
    if (!document.hidden) this.refreshDataSilently();
  };

  private async refreshDataSilently(): Promise<void> {
    try {
      const novosChamados = await firstValueFrom(this.chamadoService.buscarChamados());
      if (!novosChamados) return;
      this.chamados = novosChamados;
      this.aplicarFiltros();
      this.montarVisao();
      this.calcularMediasEquipe();
      this.calcularRankingResolvidosEquipe();
      this.calcularTempoMedioResolucaoEquipe();
      this.atualizarKpisPessoaisFromArrays();
    } catch { }
  }

  // -------- Helpers UI --------
  badgeClass(status: string): string {
    const map: Record<string, string> = {
      'Em espera': 'badge--espera',
      'Em atendimento': 'badge--andamento',
      'Finalizado': 'badge--finalizado',
      'Cancelado': 'badge--cancelado',
      'Aberto': 'badge--aberto'
    };
    return map[status] || 'badge--default';
  }

  nomeUsuario(id?: string | null): string {
    if (!id) return '';
    return this.usuarios.find(u => u.UsuarioID === id)?.Nome || '';
  }

  formatarData(iso: string): string {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  }

  private dec(v: string): string {
    if (!v) return '';
    try {
      return CryptoJS.AES.decrypt(v, environment.chavePrivada).toString(CryptoJS.enc.Utf8) || '';
    } catch {
      return v; // se não estiver criptografado
    }
  }

  private aplicarFiltros(): void {
    // cópia base
    let arr = [...this.chamados];

    // helper para "não finalizados"
    const naoFinalizado = (c: IChamadoViewSimples) =>
      c.Status !== 'Finalizado' && c.Status !== 'Cancelado';

    // 1) STATUS
    // - padrão e "Todos" => mostra NÃO FINALIZADOS
    // - "nao-resolvidos" (sentinela) => NÃO FINALIZADOS
    // - qualquer outro status específico => filtra pelo status
    if (this.filtro.status === 'Não finalizados' || this.filtro.status === 'nao-resolvidos') {
      arr = arr.filter(naoFinalizado);
    } else if (this.filtro.status && this.filtro.status !== 'Todos') {
      arr = arr.filter(c => c.Status === this.filtro.status);
    } // <-- se for 'Todos', não faz nada


    // 2) USUÁRIO (criador OU responsável)
    if (this.filtro.usuarioId) {
      const id = this.filtro.usuarioId;
      arr = arr.filter(c => c.UsuarioCriacaoID === id || c.UsuarioResponsavelID === id);
    }

    // 3) DATA (De/Até)
    if (this.filtro.dataIni) {
      const ini = new Date(this.filtro.dataIni + 'T00:00:00');
      arr = arr.filter(c => new Date(c.DataHora) >= ini);
    }
    if (this.filtro.dataFim) {
      const fim = new Date(this.filtro.dataFim + 'T23:59:59');
      arr = arr.filter(c => new Date(c.DataHora) <= fim);
    }

    this.chamadosFiltrados = arr;
  }

  onFiltroChanged(): void {
    this.aplicarFiltros();
    this.montarVisao();
    this.calcularMediasEquipe();
    this.calcularRankingResolvidosEquipe();
    this.calcularTempoMedioResolucaoEquipe();
    this.atualizarKpisPessoaisFromArrays();
  }

  limparFiltros(): void {
    // mantém “Não finalizados” e reseta usuário
    this.filtro = { status: 'Não finalizados', usuarioId: null, dataIni: '', dataFim: '' };
    // >>> reconfigura datas para 1º dia do mês até hoje
    this.setDefaultDateRangeToCurrentMonth();

    this.aplicarFiltros();
    this.montarVisao();
    this.calcularMediasEquipe();
    this.calcularRankingResolvidosEquipe();
    this.calcularTempoMedioResolucaoEquipe();
    this.atualizarKpisPessoaisFromArrays();
  }

  // ===== Derivações para a tela (agora recebe a fonte filtrada) =====
  private montarVisao(): void {
    // SEM fallback: sempre usa o resultado filtrado
    const base = this.chamadosFiltrados;

    // se não há nada após filtros, zera tudo e sai
    if (!base.length) {
      this.kpis = {
        meusAbertos: 0,
        deptoAbertos: 0,
        minhaRespAbertos: 0,
        equipeAbertos: 0,
        naoAtribuidosDR: 0,
      };
      this.statusChips = [];
      this.ultimosMeus = [];
      this.ultimosDepto = [];
      this.meusEmAtendimento = [];
      this.filaEquipe = [];
      this.equipeEmAtendimento = [];
      this.naoAtribuidosLista = [];
      return;
    }

    const meus = base.filter(c => c.UsuarioCriacaoID === this.usuarioID);

    // Departamento (por DepartamentoID do usuário)
    // Departamento (se for Diretoria, enxerga tudo)
    const usuariosDeptoSet = this.ehDiretoria
      ? new Set(this.usuarios.map(u => u.UsuarioID)) // todos
      : new Set(this.usuarios.filter(u => u.DepartamentoID === this.departamentoID).map(u => u.UsuarioID));

    const depto = base.filter(c =>
      usuariosDeptoSet.has(c.UsuarioCriacaoID) &&
      c.UsuarioCriacaoID !== this.usuarioID
    );

    // Equipe (técnicos do mesmo DepartamentoResponsavelID), EXCLUINDO eu
    // Equipe / Responsáveis
    let equipeTodos: IChamadoViewSimples[] = [];
    let meusRespTodos: IChamadoViewSimples[] = [];
    let naoAtribuidosDR: IChamadoViewSimples[] = [];

    if (this.ehTecnico || this.ehDiretoria) {
      const equipeIDs = this.getEquipeIDsParaVisao();

      equipeTodos = base.filter(c =>
        !!c.UsuarioResponsavelID &&
        equipeIDs.has(c.UsuarioResponsavelID) &&
        c.UsuarioResponsavelID !== this.usuarioID
      );

      meusRespTodos = base.filter(c => c.UsuarioResponsavelID === this.usuarioID);

      // Diretoria: qualquer chamado sem responsável
      // Não diretoria: apenas do meu DR sem responsável
      naoAtribuidosDR = base.filter(c => this.chamadoPertenceAoEscopoNaoAtribuidos(c));

      // derivados
      this.meusEmAtendimento = meusRespTodos
        .filter(c => c.Status === 'Em atendimento')
        .sort((a, b) => new Date(b.DataHora).getTime() - new Date(a.DataHora).getTime())
        .slice(0, 10);

      this.filaEquipe = [...equipeTodos]
        .sort((a, b) => new Date(a.DataHora).getTime() - new Date(b.DataHora).getTime())
        .slice(0, 10);

      this.equipeEmAtendimento = equipeTodos
        .filter(c => c.Status === 'Em atendimento')
        .sort((a, b) => new Date(b.DataHora).getTime() - new Date(a.DataHora).getTime())
        .slice(0, 10);

      this.naoAtribuidosLista = [...naoAtribuidosDR]
        .sort((a, b) => new Date(a.DataHora).getTime() - new Date(b.DataHora).getTime())
        .slice(0, 10);
    }


    // KPIs
    this.kpis = {
      meusAbertos: meus.length,
      deptoAbertos: depto.length,
      minhaRespAbertos: meusRespTodos.length,
      equipeAbertos: equipeTodos.length,
      naoAtribuidosDR: naoAtribuidosDR.length,
    };

    // chips (meus)
    const mapa: Record<string, number> = {};
    for (const c of meus) mapa[c.Status] = (mapa[c.Status] || 0) + 1;
    const ordem = ['Em atendimento', 'Em espera', 'Aguardando solicitante', 'Aguardando responsável', 'Aguardando parceiro', 'Aberto', 'Não finalizados', 'Finalizado', 'Cancelado'];
    this.statusChips = Object.keys(mapa)
      .sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b))
      .map(nome => ({ nome, qtd: mapa[nome] }));

    // listas
    this.ultimosMeus = [...meus]
      .sort((a, b) => new Date(b.DataHora).getTime() - new Date(a.DataHora).getTime())
      .slice(0, 10);

    this.ultimosDepto = [...depto]
      .sort((a, b) => new Date(b.DataHora).getTime() - new Date(a.DataHora).getTime())
      .slice(0, 10);
  }

  private calcularMediasEquipe(): void {
    this.mediasEquipe = [];

    // Diretoria OU técnico/admin (não depende de depRespID na diretoria)
    if (!this.ehDiretoria && !this.ehTecnico) return;

    const equipeIDs = this.getEquipeIDsParaVisao();
    if (!equipeIDs.size) return;

    // aplica SOMENTE filtros de data (se houver)
    let fonte = [...this.chamados]; // <- ignora filtro de status
    if (this.filtro.dataIni) {
      const ini = new Date(this.filtro.dataIni + 'T00:00:00');
      fonte = fonte.filter(c => this.dataChaveChamado(c) >= ini);
    }
    if (this.filtro.dataFim) {
      const fim = new Date(this.filtro.dataFim + 'T23:59:59');
      fonte = fonte.filter(c => this.dataChaveChamado(c) <= fim);
    }

    const elegiveis = fonte.filter(c =>
      c.Status === 'Finalizado' &&
      !!c.PesquisaSatisfacao &&
      this.labelToScore[c.PesquisaSatisfacao] > 0 &&
      !!c.UsuarioResponsavelID &&
      equipeIDs.has(c.UsuarioResponsavelID)
    );

    const agreg: Record<string, { soma: number; qtd: number }> = {};
    for (const c of elegiveis) {
      const rid = c.UsuarioResponsavelID!;
      const nota = this.labelToScore[c.PesquisaSatisfacao];
      if (!agreg[rid]) agreg[rid] = { soma: 0, qtd: 0 };
      agreg[rid].soma += nota;
      agreg[rid].qtd += 1;
    }

    this.mediasEquipe = Object.keys(agreg).map(rid => ({
      usuarioId: rid,
      nome: this.nomeUsuario(rid) || '(sem nome)',
      qtd: agreg[rid].qtd,
      media: agreg[rid].soma / agreg[rid].qtd,
    }))
      .sort((a, b) => (b.media - a.media) || (b.qtd - a.qtd) || a.nome.localeCompare(b.nome));
  }

  private calcularRankingResolvidosEquipe(): void {
    this.rankingResolvidosEquipe = [];

    if (!this.ehDiretoria && !this.ehTecnico) return;

    const equipeIDs = this.getEquipeIDsParaVisao();
    if (!equipeIDs.size) return;

    // aplica SOMENTE filtros de data
    let fonte = [...this.chamados];
    if (this.filtro.dataIni) {
      const ini = new Date(this.filtro.dataIni + 'T00:00:00');
      fonte = fonte.filter(c => this.dataChaveChamado(c) >= ini);
    }
    if (this.filtro.dataFim) {
      const fim = new Date(this.filtro.dataFim + 'T23:59:59');
      fonte = fonte.filter(c => this.dataChaveChamado(c) <= fim);
    }

    const finalizadosEquipe = fonte.filter(c =>
      c.Status === 'Finalizado' &&
      !!c.UsuarioResponsavelID &&
      equipeIDs.has(c.UsuarioResponsavelID)
    );

    const agreg: Record<string, number> = {};
    for (const c of finalizadosEquipe) {
      const rid = c.UsuarioResponsavelID!;
      agreg[rid] = (agreg[rid] || 0) + 1;
    }

    this.rankingResolvidosEquipe = Object.keys(agreg)
      .map(rid => ({
        usuarioId: rid,
        nome: this.nomeUsuario(rid) || '(sem nome)',
        resolvidos: agreg[rid],
      }))
      .sort((a, b) => b.resolvidos - a.resolvidos || a.nome.localeCompare(b.nome));
  }

  private dataChaveChamado(c: IChamadoViewSimples): Date {
    // para filtros: prioriza DataHoraFinalizacao (se válida), senão abertura
    const iso = (c.DataHoraFinalizacao && c.DataHoraFinalizacao !== '0001-01-01T00:00:00')
      ? c.DataHoraFinalizacao
      : c.DataHora;
    return new Date(iso);
  }

  /** minutos úteis entre duas datas: 07-12 e 14-18, seg-sex */
  private businessMinutesBetween(a: Date, b: Date): number {
    let start = new Date(a);
    let end = new Date(b);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 0;

    start.setSeconds(0, 0);
    end.setSeconds(0, 0);

    const blocks = [
      { s: 7 * 60, e: 12 * 60 },  // 07:00–12:00
      { s: 14 * 60, e: 18 * 60 }, // 14:00–18:00
    ];
    const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
    const toMin = (d: Date) => d.getHours() * 60 + d.getMinutes();

    let cur = new Date(start);
    let total = 0;

    while (cur < end) {
      if (!isWeekend(cur)) {
        const dayStart = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 0, 0, 0, 0);
        const dayEnd = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 23, 59, 59, 999);

        const segIni = cur > start ? cur : start;
        const segFim = dayEnd < end ? dayEnd : end;

        if (segFim > segIni) {
          const iniMin = toMin(segIni);
          const fimMin = toMin(segFim);

          for (const blk of blocks) {
            const iStart = Math.max(iniMin, blk.s);
            const iEnd = Math.min(fimMin, blk.e);
            if (iEnd > iStart) total += (iEnd - iStart);
          }
        }
      }
      // próximo dia 00:00
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1, 0, 0, 0, 0);
    }
    return total;
  }

  /** formata minutos em "Xd Yh Zm" (8h úteis por dia) */
  private formatMinutesHuman(mins: number): string {
    const m = Math.max(0, Math.round(mins));
    const porDia = 8 * 60; // 8 horas úteis/dia
    const dias = Math.floor(m / porDia);
    const resto = m % porDia;
    const horas = Math.floor(resto / 60);
    const minutos = resto % 60;

    const parts: string[] = [];
    if (dias) parts.push(`${dias}d`);
    if (horas) parts.push(`${horas}h`);
    if (minutos || parts.length === 0) parts.push(`${minutos}m`);
    return parts.join(' ');
  }

  private calcularTempoMedioResolucaoEquipe(): void {
    this.avgResolucaoEquipe = [];

    if (!this.ehDiretoria && !this.ehTecnico) return;

    const equipeIDs = this.getEquipeIDsParaVisao();
    if (!equipeIDs.size) return;

    // aplica SOMENTE filtros de data (pela data de finalização quando houver)
    let fonte = [...this.chamados];
    if (this.filtro.dataIni) {
      const ini = new Date(this.filtro.dataIni + 'T00:00:00');
      fonte = fonte.filter(c => this.dataChaveChamado(c) >= ini);
    }
    if (this.filtro.dataFim) {
      const fim = new Date(this.filtro.dataFim + 'T23:59:59');
      fonte = fonte.filter(c => this.dataChaveChamado(c) <= fim);
    }

    const finalizadosEquipeMesmoDia = fonte.filter(c => {
      if (c.Status !== 'Finalizado') return false;
      if (!c.UsuarioResponsavelID || !equipeIDs.has(c.UsuarioResponsavelID)) return false;
      if (!c.DataHora || !c.DataHoraFinalizacao || c.DataHoraFinalizacao === '0001-01-01T00:00:00') return false;

      const ini = new Date(c.DataHora);
      const fim = new Date(c.DataHoraFinalizacao);
      if (isNaN(ini.getTime()) || isNaN(fim.getTime()) || fim <= ini) return false;

      return this.sameLocalDay(ini, fim);
    });

    const agreg: Record<string, { somaMin: number; qtd: number }> = {};
    for (const c of finalizadosEquipeMesmoDia) {
      const ini = new Date(c.DataHora);
      const fim = new Date(c.DataHoraFinalizacao);
      const minutos = this.businessMinutesBetween(ini, fim);
      const rid = c.UsuarioResponsavelID!;
      if (!agreg[rid]) agreg[rid] = { somaMin: 0, qtd: 0 };
      agreg[rid].somaMin += minutos;
      agreg[rid].qtd += 1;
    }

    this.avgResolucaoEquipe = Object.keys(agreg).map(rid => {
      const media = agreg[rid].somaMin / agreg[rid].qtd;
      return {
        usuarioId: rid,
        nome: this.nomeUsuario(rid) || '(sem nome)',
        qtd: agreg[rid].qtd,
        mediaMin: media,
        mediaFmt: this.formatMinutesHuman(media),
      };
    }).sort((a, b) =>
      a.mediaMin - b.mediaMin ||
      b.qtd - a.qtd ||
      a.nome.localeCompare(b.nome)
    );
  }

  private sameLocalDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  private atualizarKpisPessoaisFromArrays(): void {
    const id = this.usuarioID;

    // 1) Minha média de avaliação (⭐) a partir de mediasEquipe
    const m = this.mediasEquipe?.find(x => x.usuarioId === id);
    this.meusKpis.mediaAvaliacaoFmt = (m && isFinite(m.media))
      ? String(this.roundHalfDown(m.media))
      : '—';

    // 2) Meu tempo médio (úteis) a partir de avgResolucaoEquipe
    const t = this.avgResolucaoEquipe?.find(x => x.usuarioId === id);
    this.meusKpis.tempoMedioFmt = t?.mediaFmt ?? '—';

    // 3) Meu rank a partir do rankingResolvidosEquipe (posição no array + 1)
    const pos = this.rankingResolvidosEquipe?.findIndex(x => x.usuarioId === id) ?? -1;
    this.meusKpis.meuRank = pos >= 0 ? (pos + 1) : null;
  }

  private roundHalfDown(n: number): number {
    return Math.ceil(n - 0.5);
  }

  private getEquipeIDsParaVisao(): Set<string> {
    // Diretoria: todo mundo técnico/admin ativo (menos excluídos)
    if (this.ehDiretoria) {
      return new Set(
        this.usuarios
          .filter(u =>
            (u.PerfilAcesso === 'Tecnico' || u.PerfilAcesso === 'Administrador' || u.PerfilAcesso === 'SuperAdministrador') &&
            u.Ativo &&
            !this.isExcluido(u.UsuarioID)
          )
          .map(u => u.UsuarioID)
      );
    }

    // Não diretoria: equipe do meu DR (como hoje)
    if (!this.depRespID) return new Set<string>();

    return new Set(
      this.usuarios
        .filter(u =>
          u.DepartamentoResponsavelID === this.depRespID &&
          (u.PerfilAcesso === 'Tecnico' || u.PerfilAcesso === 'Administrador' || u.PerfilAcesso === 'SuperAdministrador') &&
          u.Ativo &&
          !this.isExcluido(u.UsuarioID)
        )
        .map(u => u.UsuarioID)
    );
  }

  private chamadoPertenceAoEscopoNaoAtribuidos(c: IChamadoViewSimples): boolean {
    // Diretoria: "não atribuídos" = qualquer chamado sem responsável
    if (this.ehDiretoria) {
      return !c.UsuarioResponsavelID || c.UsuarioResponsavelID === '';
    }

    // Não diretoria: mantém regra atual (depResp)
    return !!this.depRespID &&
      c.DepartamentoResponsavelID === this.depRespID &&
      (!c.UsuarioResponsavelID || c.UsuarioResponsavelID === '');
  }

}
