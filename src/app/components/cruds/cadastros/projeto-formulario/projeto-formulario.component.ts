import { Component, OnInit, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import * as CryptoJS from 'crypto-js';

import { IDepartamentoResponsavel } from 'src/app/modules/chamados/departamentoResponsavel.interface';
import { DepartamentoResponsavelService } from 'src/app/services/chamados/departamentoResponsavel.service';
import { IProjetoForm, IProjetoView } from 'src/app/modules/cruds/cadastros/projeto.interface';
import { ProjetoService } from 'src/app/services/cruds/cadastros/projeto.service';
import { MensagemService } from 'src/app/services/mensagem.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-projeto-formulario',
  templateUrl: './projeto-formulario.component.html',
  styleUrl: './projeto-formulario.component.scss'
})
export class ProjetoFormularioComponent implements OnInit {
  protected departamentoResponsavel: string | null = CryptoJS.AES.decrypt(localStorage.getItem('DepartamentoResponsavelID') || '', environment.chavePrivada).toString(CryptoJS.enc.Utf8) || null;

  protected urlAtual = this.activatedRoute.snapshot.url;
  protected carregando: boolean = false;
  protected confirmacaoAtiva: boolean = false;

  protected projetoID: string = '';
  protected projetoAtual!: IProjetoView;

  protected formularioProjeto!: FormGroup;

  protected departamentos: IDepartamentoResponsavel[] = [];

  constructor(
    private projetoService: ProjetoService,
    private departamentoResponsavelService: DepartamentoResponsavelService,
    private mensagemService: MensagemService,
    private fb: FormBuilder,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private elementRef: ElementRef,
  ) { }

  async ngOnInit(): Promise<void> {
    try {
      this.carregando = true;

      this.formularioProjeto = this.fb.group({
        Projeto: ['', Validators.required],
        Tipo: [''],
        DepartamentoResponsavelID: ['', Validators.required]
      });

      this.departamentos = await this.departamentoResponsavelService.buscarDepartamentosResponsaveis().toPromise() || [];

      if (this.urlAtual.length == 3) {
        this.projetoID = this.activatedRoute.snapshot.paramMap.get('ProjetoID') || '';
        this.projetoAtual = await this.projetoService.buscarProjeto(this.projetoID).toPromise() || this.projetoAtual;

        this.formularioProjeto.patchValue({
          Projeto: this.projetoAtual.Projeto,
          Tipo: this.projetoAtual.Tipo,
          DepartamentoResponsavelID: this.projetoAtual.DepartamentoResponsavelID
        });
      }
    }
    catch (err: any) {
      console.error(err);
    }
    finally {
      this.carregando = false;
    }
  }

  onSubmit(): void {
    if (this.formularioProjeto.valid) {
      this.carregando = true;

      const projeto: IProjetoForm = {
        Projeto: this.formularioProjeto.get('Projeto')?.value,
        Tipo: this.formularioProjeto.get('Tipo')?.value == '' ? null : this.formularioProjeto.get('Tipo')?.value,
        DepartamentoResponsavelID: this.formularioProjeto.get('DepartamentoResponsavelID')?.value
      }

      const mensagemSucesso = this.urlAtual.length == 3
        ? 'Projeto editado!'
        : 'Projeto criado!';

      const serviceCall = this.urlAtual.length == 3
        ? this.projetoService.atualizarProjeto(this.projetoID, projeto)
        : this.projetoService.cadastrarProjeto(projeto);

      serviceCall.subscribe(() => {
        this.mensagemService.adicionarMensagem(mensagemSucesso);
        this.router.navigate(['/Projetos']);
      }, (error: any) => {
        this.mensagemService.adicionarMensagem(error.error.Resposta);
        console.error(error.error.Resposta);
        this.carregando = false;
      });
    }
  }
}
