import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import * as CryptoJS from 'crypto-js';

import { environment } from 'src/environments/environment';

// Services & Interfaces
import { ChamadoRecorrenteService } from 'src/app/services/chamados/chamadoRecorrente.service';
import { UsuarioService } from 'src/app/services/cruds/cadastros/usuario.service';
import { ServicoService } from 'src/app/services/chamados/servico.service';
import { DepartamentoResponsavelService } from 'src/app/services/chamados/departamentoResponsavel.service';
import { BlocoService } from 'src/app/services/chamados/bloco.service';
import { MensagemService } from 'src/app/services/mensagem.service';

import { IChamadoRecorrenteView } from 'src/app/modules/chamados/chamadoRecorrente.interface';
import { IUsuarioView } from 'src/app/modules/cruds/cadastros/usuario.interface';
import { IServico, ITipoServico } from 'src/app/modules/chamados/service.interface';
import { IDepartamentoResponsavel } from 'src/app/modules/chamados/departamentoResponsavel.interface';
import { IBloco } from 'src/app/modules/chamados/bloco.interface';

@Component({
  selector: 'app-detalhes-chamado-recorrente',
  templateUrl: './detalhes-chamados-recorrentes.component.html',
  styleUrls: ['./detalhes-chamados-recorrentes.component.scss']
})
export class DetalhesChamadosRecorrentesComponent implements OnInit {
  carregando = true;

  // ids do usuário logado (se precisar filtrar permissões)
  protected usuarioID: string = CryptoJS.AES.decrypt(localStorage.getItem('UsuarioID') || '', environment.chavePrivada).toString(CryptoJS.enc.Utf8);

  // formulário só para exibir bloqueado (mantém padrão do seu exemplo)
  formRecorrente!: FormGroup;

  // dados
  dados!: IChamadoRecorrenteView;

  // *Dimensões*
  usuarios: IUsuarioView[] = [];
  usuariosTecnicos: IUsuarioView[] = [];
  servicos: IServico[] = [];
  tiposServico: ITipoServico[] = [];
  departamentos: IDepartamentoResponsavel[] = [];
  blocos: IBloco[] = [];

  nomes = {
    solicitante: '—',
    responsavel: 'Não atribuído',
  };

  // próximas ocorrências
  proximasOcorrencias: Date[] = [];
  private QTD_OCORRENCIAS = 12;

  // constantes locais
  depPredioId = '17069ABC-9CE0-4E60-B119-79E20B05E6B0'; // igual ao seu exemplo

  prioridades = [
    { nome: 'Baixa', valor: 'Baixa' },
    { nome: 'Média', valor: 'Média' },
    { nome: 'Alta', valor: 'Alta' },
    { nome: 'Urgente', valor: 'Urgente' }
  ];

  private readonly PREVIEW_LIMITS = {
    image: 8 * 1024 * 1024,  // 8 MB
    pdf: 15 * 1024 * 1024, // 15 MB
    excel: 10 * 1024 * 1024, // 10 MB (além do limite por células)
    video: 25 * 1024 * 1024, // 25 MB
    audio: 10 * 1024 * 1024, // 10 MB
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private svc: ChamadoRecorrenteService,
    private usuarioSvc: UsuarioService,
    private servicoSvc: ServicoService,
    private departamentoSvc: DepartamentoResponsavelService,
    private blocoSvc: BlocoService,
    private toast: MensagemService
  ) { }

  async ngOnInit(): Promise<void> {
    this.formRecorrente = this.fb.group({
      Titulo: [''],
      Prioridade: [''],
      UsuarioCriacaoID: [''],
      DepartamentoResponsavelID: [''],
      UsuarioResponsavelID: [''],
      BlocoID: [''],
      ServicoID: [''],
      TipoServicoID: [''],
    });

    const id = this.route.snapshot.paramMap.get('ChamadoRecorrenteID') || '';

    try {
      // carrega dimensões em paralelo
      const [usuarios, servicos, departamentos, blocos] = await Promise.all([
        this.usuarioSvc.buscarUsuarios().toPromise().then(u => (u || []).filter(x => x.Ativo)),
        this.servicoSvc.buscarServicos().toPromise().then(s => s || []),
        this.departamentoSvc.buscarDepartamentosResponsaveis().toPromise().then(d => d || []),
        this.blocoSvc.buscarBlocos().toPromise().then(b => b || []),
      ]);

      this.usuarios = usuarios.sort((a, b) => a.Nome.localeCompare(b.Nome));
      this.usuariosTecnicos = usuarios.filter(u => (u.PerfilAcesso === 'Tecnico' || u.PerfilAcesso === 'Administrador' || u.PerfilAcesso === 'SuperAdministrador'));
      this.servicos = servicos.sort((a, b) => a.Servico.localeCompare(b.Servico));
      this.departamentos = departamentos;
      this.blocos = blocos;

      // dado principal
      this.dados = await this.svc.buscarChamadoRecorrente(id).toPromise() as IChamadoRecorrenteView;

      // tipos do serviço atual
      this.tiposServico = (this.servicos.find(s => s.ServicoID === this.dados.ServicoID)?.TipoServico || [])
        .sort((a, b) => (a.TipoServico || '').localeCompare(b.TipoServico || ''));

      // nomes auxiliares
      this.nomes.solicitante = this.usuarios.find(u => u.UsuarioID === this.dados.UsuarioCriacaoID)?.Nome || '—';
      this.nomes.responsavel = this.usuarios.find(u => u.UsuarioID === this.dados.UsuarioResponsavelID)?.Nome || 'Não atribuído';

      // preenche form (disabled visual)
      this.formRecorrente.patchValue({
        Titulo: this.dados.Titulo,
        Prioridade: this.dados.Prioridade,
        UsuarioCriacaoID: this.dados.UsuarioCriacaoID,
        DepartamentoResponsavelID: this.dados.DepartamentoResponsavelID,
        UsuarioResponsavelID: this.dados.UsuarioResponsavelID,
        BlocoID: this.dados.BlocoID || '',
        ServicoID: this.dados.ServicoID,
        TipoServicoID: this.dados.TipoServicoID || '',
      });
      Object.keys(this.formRecorrente.controls).forEach(c => this.formRecorrente.get(c)?.disable());

      // calcula próximas ocorrências
      this.proximasOcorrencias = this.calcularProximasOcorrencias(this.dados, this.QTD_OCORRENCIAS);
    } catch (e) {
      console.error(e);
      this.toast.adicionarMensagem('Erro ao carregar os detalhes da recorrência.');
    } finally {
      this.carregando = false;
    }
  }

  voltarPaginaAnterior(): void {
    history.back();
  }

  editar(): void {
    this.router.navigate([`/ChamadosRecorrentes/Editar/${this.dados.ChamadoRecorrenteID}`]);
  }

  async alternarAtivo(): Promise<void> {
    try {
      if (this.dados.Ativo) {
        await this.svc.desativar(this.dados.ChamadoRecorrenteID).toPromise();
        this.toast.adicionarMensagem('Recorrência desativada.');
        this.dados.Ativo = false;
      } else {
        await this.svc.ativar(this.dados.ChamadoRecorrenteID).toPromise();
        this.toast.adicionarMensagem('Recorrência ativada.');
        this.dados.Ativo = true;
      }
    } catch (e) {
      console.error(e);
      this.toast.adicionarMensagem('Falha ao alternar status.');
    }
  }

  // ===== Helpers de exibição =====
  formatarDataHora(iso: string | Date | null): string {
    if (!iso) return '—';
    const d = typeof iso === 'string' ? new Date(iso) : iso;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const HH = String(d.getHours()).padStart(2, '0');
    const MM = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} - ${HH}:${MM}`;
  }

  diasSemanaTexto(r: IChamadoRecorrenteView): string {
    const map = [
      { on: (r as any).Dom, n: 'Dom' },
      { on: (r as any).Seg, n: 'Seg' },
      { on: (r as any).Ter, n: 'Ter' },
      { on: (r as any).Qua, n: 'Qua' },
      { on: (r as any).Qui, n: 'Qui' },
      { on: (r as any).Sex, n: 'Sex' },
      { on: (r as any).Sab, n: 'Sáb' },
    ];
    const esc = map.filter(x => x.on).map(x => x.n);
    return esc.length ? esc.join(', ') : '—';
  }

  // ===== Cálculo de próximas ocorrências =====
  private calcularProximasOcorrencias(r: IChamadoRecorrenteView, qtd: number): Date[] {
    const out: Date[] = [];
    if (!r.Ativo) return out;

    const inicio = new Date(r.DataInicio);
    const fim = r.DataFim ? new Date(r.DataFim) : null;

    const agora = new Date();
    const startFrom = agora < inicio ? new Date(inicio) : new Date(agora);

    const h0 = inicio.getHours();
    const m0 = inicio.getMinutes();

    const pushIfValida = (d: Date) => {
      if (d < inicio) return;
      if (fim && d > fim) return;
      out.push(d);
    };

    if (r.Frequencia === 'DIARIA') {
      let cur = new Date(startFrom); cur.setHours(h0, m0, 0, 0);
      if (cur < startFrom) cur.setDate(cur.getDate() + 1);
      while (out.length < qtd) {
        pushIfValida(new Date(cur));
        cur.setDate(cur.getDate() + 1);
        if (fim && cur > fim) break;
      }
      return out;
    }

    if (r.Frequencia === 'SEMANAL') {
      const dias = [(r as any).Dom, (r as any).Seg, (r as any).Ter, (r as any).Qua, (r as any).Qui, (r as any).Sex, (r as any).Sab];
      let cur = new Date(startFrom); cur.setHours(h0, m0, 0, 0);
      let guard = 0;
      while (out.length < qtd && guard < 730) { // ~2 anos
        if (dias[cur.getDay()]) pushIfValida(new Date(cur));
        cur.setDate(cur.getDate() + 1);
        guard++;
        if (fim && cur > fim) break;
      }
      return out;
    }

    if (r.Frequencia === 'MENSAL') {
      const dia = (r as any).DiaDoMes || inicio.getDate();
      let y = startFrom.getFullYear();
      let m = startFrom.getMonth();
      let cur = new Date(y, m, dia, h0, m0, 0, 0);
      if (cur < startFrom) cur = new Date(y, m + 1, dia, h0, m0, 0, 0);
      while (out.length < qtd) {
        pushIfValida(new Date(cur));
        m += 1;
        cur = new Date(cur.getFullYear(), m, dia, h0, m0, 0, 0);
        if (fim && cur > fim) break;
      }
      return out;
    }

    if (r.Frequencia === 'ANUAL') {
      const dia = (r as any).DiaDoMes || inicio.getDate();
      const mesIdx = ((r as any).MesDoAno ? (r as any).MesDoAno - 1 : inicio.getMonth());
      let y = startFrom.getFullYear();
      let cur = new Date(y, mesIdx, dia, h0, m0, 0, 0);
      if (cur < startFrom) cur = new Date(y + 1, mesIdx, dia, h0, m0, 0, 0);
      while (out.length < qtd) {
        pushIfValida(new Date(cur));
        cur = new Date(cur.getFullYear() + 1, mesIdx, dia, h0, m0, 0, 0);
        if (fim && cur > fim) break;
      }
      return out;
    }

    return out;
  }
}
