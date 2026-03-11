import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as CryptoJS from 'crypto-js';
import { Router } from '@angular/router';

import { environment } from 'src/environments/environment';

import { UsuarioService } from 'src/app/services/cruds/cadastros/usuario.service';
import { DepartamentoResponsavelService } from 'src/app/services/chamados/departamentoResponsavel.service';
import { ServicoService } from 'src/app/services/chamados/servico.service';
import { BlocoService } from 'src/app/services/chamados/bloco.service';

import { IUsuarioView } from 'src/app/modules/cruds/cadastros/usuario.interface';
import { IDepartamentoResponsavel } from 'src/app/modules/chamados/departamentoResponsavel.interface';
import { IServico, ITipoServico } from 'src/app/modules/chamados/service.interface';
import { IBloco } from 'src/app/modules/chamados/bloco.interface';

import { ChamadoRecorrenteService } from 'src/app/services/chamados/chamadoRecorrente.service';
import { IChamadoRecorrenteForm, IChamadoRecorrenteRetornoForm } from 'src/app/modules/chamados/chamadoRecorrente.interface';
import { MensagemService } from 'src/app/services/mensagem.service';
import { notOnlyWhitespaceValidator } from 'src/app/helpers/notOnlyWhitespaceValidator';

@Component({
  selector: 'app-novo-chamado-recorrente',
  templateUrl: './novo-chamado-recorrente.component.html',
  styleUrls: ['./novo-chamado-recorrente.component.scss']
})
export class NovoChamadoRecorrenteComponent implements OnInit {
  carregando = true;

  prioridades = [
    { nome: 'Baixa', valor: 'Baixa' },
    { nome: 'Média', valor: 'Média' },
    { nome: 'Alta', valor: 'Alta' },
    { nome: 'Urgente', valor: 'Urgente' }
  ];

  frequencias = ['DIARIA', 'SEMANAL', 'MENSAL', 'ANUAL'];
  periodos = ['MATUTINO', 'VESPERTINO'];

  usuarios: IUsuarioView[] = [];
  usuariosTecnicos: IUsuarioView[] = [];
  usuariosTecnicosPorDepartamento: IUsuarioView[] = [];

  departamentosResponsaveis: IDepartamentoResponsavel[] = [];
  servicos: IServico[] = [];
  servicosPorDepartamento: IServico[] = [];
  tiposServico: ITipoServico[] = [];
  blocos: IBloco[] = [];

  formulario!: FormGroup;

  private readonly DRAFT_KEY = 'novo-chamado-recorrente-draft-v1';

  constructor(
    private fb: FormBuilder,
    private usuarioService: UsuarioService,
    private departamentoService: DepartamentoResponsavelService,
    private servicoService: ServicoService,
    private blocoService: BlocoService,
    private recorrenteService: ChamadoRecorrenteService,
    private router: Router,
    private mensagens: MensagemService
  ) { }

  async ngOnInit(): Promise<void> {
    this.formulario = this.fb.group({
      Titulo: ['', Validators.required],
      Prioridade: ['', Validators.required],

      DepartamentoResponsavelID: ['', Validators.required],
      UsuarioCriacaoID: [''],
      UsuarioResponsavelID: [{ value: '', disabled: true }],
      ServicoID: [{ value: '', disabled: true }, Validators.required],
      TipoServicoID: [{ value: '', disabled: true }, Validators.required],
      BlocoID: [''],

      Frequencia: ['', Validators.required],
      Periodo: ['', Validators.required],
      DataInicio: [this.localIsoNow(), Validators.required],
      DataFim: [''],

      Dom: [false], Seg: [false], Ter: [false], Qua: [false], Qui: [false], Sex: [false], Sab: [false],
      DiaDoMes: [null],
      MesDoAno: [null],

      Ativo: [true],
      Mensagem: ['', [Validators.required, notOnlyWhitespaceValidator]]
    });

    this.restoreDraft();

    try {
      const usuarios = (await this.usuarioService.buscarUsuarios().toPromise()) || [];
      this.usuarios = usuarios.filter(u => u.Ativo).sort((a, b) => a.Nome.localeCompare(b.Nome));
      this.usuariosTecnicos = usuarios
        .filter(u => (u.PerfilAcesso === 'Tecnico' || u.PerfilAcesso === 'Administrador' || u.PerfilAcesso === 'SuperAdministrador') && u.Ativo)
        .sort((a, b) => a.Nome.localeCompare(b.Nome));

      this.departamentosResponsaveis = (await this.departamentoService.buscarDepartamentosResponsaveis().toPromise()) || [];
      this.servicos = (await this.servicoService.buscarServicos().toPromise()) || [];
      this.blocos = (await this.blocoService.buscarBlocos().toPromise() || [])
        .sort((a, b) => (a.Bloco.match(/^Bloco\s+([A-Z])/i)?.[1] || '').localeCompare(b.Bloco.match(/^Bloco\s+([A-Z])/i)?.[1] || ''));
      this.formulario.get('DepartamentoResponsavelID')?.valueChanges.subscribe(depID => {
        if (depID) {
          this.enable(['UsuarioResponsavelID', 'ServicoID']);
          this.servicosPorDepartamento = this.servicos
            .filter(s => s.DepartamentoResponsavelID === depID)
            .sort((a, b) => a.Servico.localeCompare(b.Servico));
          this.usuariosTecnicosPorDepartamento = this.usuariosTecnicos
            .filter(u => u.DepartamentoResponsavelID === depID)
            .sort((a, b) => a.Nome.localeCompare(b.Nome));
        } else {
          this.disableAndReset(['UsuarioResponsavelID', 'ServicoID', 'TipoServicoID']);
        }
      });

      this.formulario.get('ServicoID')?.valueChanges.subscribe(servID => {
        if (servID) {
          this.tiposServico =
            this.servicos.find(s => s.ServicoID === servID)?.TipoServico?.slice().sort((a, b) => a.TipoServico.localeCompare(b.TipoServico)) || [];
          this.enable(['TipoServicoID']);
        } else {
          this.disableAndReset(['TipoServicoID']);
        }
      });

      this.formulario.get('Frequencia')?.valueChanges.subscribe(freq => {
        this.applyFrequencyRules(freq);
      });

      this.hidratarCombosDoDraft();

      this.setupDraftAutosave();

    } catch (e) {
      console.error('Erro ao carregar dados:', e);
    } finally {
      this.carregando = false;
    }
  }

  private enable(keys: string[]) { keys.forEach(k => this.formulario.get(k)?.enable()); }
  private disableAndReset(keys: string[]) { keys.forEach(k => { const c = this.formulario.get(k); c?.reset(); c?.disable(); }); }

  private localIsoNow(): string {
    const d = new Date();
    const offsetMs = d.getTimezoneOffset() * 180000;
    const local = new Date(d.getTime() - offsetMs);
    return local.toISOString().slice(0, 19);
  }

  // === Validações dinâmicas por frequência ===
  private applyFrequencyRules(freq: string) {
    const weeklyCtrls = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const diaCtrl = this.formulario.get('DiaDoMes')!;
    const mesCtrl = this.formulario.get('MesDoAno')!;

    // limpa erros
    weeklyCtrls.forEach(k => this.formulario.get(k)?.setErrors(null));
    diaCtrl.setErrors(null); mesCtrl.setErrors(null);

    // zera campos que não interessam
    if (freq !== 'SEMANAL') weeklyCtrls.forEach(k => this.formulario.get(k)?.setValue(false, { emitEvent: false }));
    if (freq !== 'MENSAL' && freq !== 'ANUAL') this.formulario.patchValue({ DiaDoMes: null }, { emitEvent: false });
    if (freq !== 'ANUAL') this.formulario.patchValue({ MesDoAno: null }, { emitEvent: false });
  }

  // valida antes de enviar
  private validarNegocio(): void {
    const freq = (this.formulario.get('Frequencia')?.value || '').toUpperCase();
    if (freq === 'SEMANAL') {
      const soma =
        ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
          .map(k => !!this.formulario.get(k)?.value ? 1 : 0)
          .reduce((a: number, b: number) => a + b, 0);
      if (soma === 0) throw new Error('Para SEMANAL, marque pelo menos um dia da semana.');
    }
    if (freq === 'MENSAL') {
      const d = this.formulario.get('DiaDoMes')?.value;
      if (d == null) throw new Error('Para MENSAL, informe DiaDoMes (1..31).');
      if (d < 1 || d > 31) throw new Error('DiaDoMes deve estar entre 1 e 31.');
    }
    if (freq === 'ANUAL') {
      const d = this.formulario.get('DiaDoMes')?.value;
      const m = this.formulario.get('MesDoAno')?.value;
      if (d == null || m == null) throw new Error('Para ANUAL, informe DiaDoMes (1..31) e MesDoAno (1..12).');
      if (d < 1 || d > 31) throw new Error('DiaDoMes deve estar entre 1 e 31.');
      if (m < 1 || m > 12) throw new Error('MesDoAno deve estar entre 1 e 12.');
    }
    const ini = this.formulario.get('DataInicio')?.value;
    const fim = this.formulario.get('DataFim')?.value;
    if (ini && fim && new Date(fim) < new Date(ini)) {
      throw new Error('DataFim não pode ser menor que DataInicio.');
    }
  }

  meAtribuirComoSolicitante(): void {
    const usuarioID = CryptoJS.AES.decrypt(localStorage.getItem('UsuarioID') || '', environment.chavePrivada).toString(CryptoJS.enc.Utf8);
    this.formulario.get('UsuarioCriacaoID')?.setValue(usuarioID);
  }

  onSubmit(): void {
    if (!this.formulario.valid) return;

    try {
      this.validarNegocio();
    } catch (e: any) {
      this.mensagens.adicionarMensagem(e.message || 'Erro de validação.');
      return;
    }

    this.carregando = true;

    const payload: IChamadoRecorrenteForm = {
      Titulo: this.formulario.value.Titulo,
      Prioridade: this.formulario.value.Prioridade,

      DepartamentoResponsavelID: this.formulario.value.DepartamentoResponsavelID,
      UsuarioCriacaoID: this.formulario.value.UsuarioCriacaoID === ''
        ? CryptoJS.AES.decrypt(localStorage.getItem('UsuarioID') || '', environment.chavePrivada).toString(CryptoJS.enc.Utf8)
        : this.formulario.value.UsuarioCriacaoID,
      UsuarioResponsavelID: this.formulario.value.UsuarioResponsavelID || null,
      ServicoID: this.formulario.value.ServicoID,
      TipoServicoID: this.formulario.value.TipoServicoID,
      BlocoID: this.formulario.value.BlocoID || null,

      Frequencia: this.formulario.value.Frequencia,
      Periodo: this.formulario.value.Periodo,
      DataInicio: this.formulario.value.DataInicio,
      DataFim: this.formulario.value.DataFim || null,

      Dom: !!this.formulario.value.Dom,
      Seg: !!this.formulario.value.Seg,
      Ter: !!this.formulario.value.Ter,
      Qua: !!this.formulario.value.Qua,
      Qui: !!this.formulario.value.Qui,
      Sex: !!this.formulario.value.Sex,
      Sab: !!this.formulario.value.Sab,

      DiaDoMes: this.formulario.value.DiaDoMes ?? null,
      MesDoAno: this.formulario.value.MesDoAno ?? null,

      Ativo: !!this.formulario.value.Ativo,

      Mensagem: this.formulario.value.Mensagem || null
    };

    this.recorrenteService.criarChamadoRecorrente(payload).subscribe({
      next: (ret: IChamadoRecorrenteRetornoForm) => {
        sessionStorage.removeItem(this.DRAFT_KEY);
        this.carregando = false;
        this.mensagens.adicionarMensagem('Chamado recorrente criado com sucesso!');
        // navegar para a tela de listagem/detalhe se existir
        this.router.navigate([`/Chamados/Detalhes/Recorrentes/${ret.ChamadoRecorrenteID}`]);
      },
      error: (err: any) => {
        console.error('Erro ao criar chamado recorrente:', err);
        this.carregando = false;
        this.mensagens.adicionarMensagem('Erro ao criar chamado recorrente.');
      }
    });
  }

  private restoreDraft(): void {
    const raw = sessionStorage.getItem(this.DRAFT_KEY);
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      this.formulario.patchValue(data, { emitEvent: false });
    } catch {
      sessionStorage.removeItem(this.DRAFT_KEY);
    }
  }

  private setupDraftAutosave(): void {
    this.formulario.valueChanges.subscribe(() => {
      const raw = this.formulario.getRawValue(); // pega disabled também
      sessionStorage.setItem(this.DRAFT_KEY, JSON.stringify(raw));
    });
  }

  private hidratarCombosDoDraft(): void {
    const depId = this.formulario.get('DepartamentoResponsavelID')?.value;
    const servId = this.formulario.get('ServicoID')?.value;
    const freq = this.formulario.get('Frequencia')?.value;

    // --- DEP -> habilita e popula responsáveis/serviços
    if (depId) {
      this.enable(['UsuarioResponsavelID', 'ServicoID']);

      this.servicosPorDepartamento = this.servicos
        .filter(s => s.DepartamentoResponsavelID === depId)
        .sort((a, b) => a.Servico.localeCompare(b.Servico));

      this.usuariosTecnicosPorDepartamento = this.usuariosTecnicos
        .filter(u => u.DepartamentoResponsavelID === depId)
        .sort((a, b) => a.Nome.localeCompare(b.Nome));
    } else {
      this.disableAndReset(['UsuarioResponsavelID', 'ServicoID', 'TipoServicoID']);
      this.servicosPorDepartamento = [];
      this.usuariosTecnicosPorDepartamento = [];
      this.tiposServico = [];
    }

    // --- SERVIÇO -> habilita e popula tipos
    if (servId) {
      const serv = this.servicos.find(s => s.ServicoID === servId);
      this.tiposServico = (serv?.TipoServico ?? [])
        .slice()
        .sort((a, b) => a.TipoServico.localeCompare(b.TipoServico));

      this.enable(['TipoServicoID']);
    } else {
      this.disableAndReset(['TipoServicoID']);
      this.tiposServico = [];
    }

    // --- FREQUÊNCIA -> aplica regras visuais/validação (sem depender do valueChanges)
    if (freq) {
      this.applyFrequencyRules(freq);
    }

    // (Opcional, mas recomendado) Se o serviço salvo não pertence ao dep salvo, limpa cascata
    if (depId && servId) {
      const ok = this.servicosPorDepartamento.some(s => s.ServicoID === servId);
      if (!ok) {
        this.formulario.patchValue({ ServicoID: '', TipoServicoID: '' }, { emitEvent: false });
        this.tiposServico = [];
        this.disableAndReset(['TipoServicoID']);
      }
    }

    // (Opcional) Se Tipo salvo não existe mais, limpa
    const tipoId = this.formulario.get('TipoServicoID')?.value;
    if (tipoId) {
      const okTipo = this.tiposServico.some(t => t.TipoServicoID === tipoId);
      if (!okTipo) this.formulario.patchValue({ TipoServicoID: '' }, { emitEvent: false });
    }
  }
}
