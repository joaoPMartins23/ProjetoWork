import { Component, OnInit, ElementRef, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { IDepartamentoView, IDepartamentoForm } from 'src/app/modules/cruds/cadastros/departamento.interface';
import { DepartamentoService } from 'src/app/services/cruds/cadastros/departamento.service';
import { MensagemService } from 'src/app/services/mensagem.service';

@Component({
  selector: 'app-departamento-formulario',
  templateUrl: './departamento-formulario.component.html',
  styleUrl: './departamento-formulario.component.scss'
})
export class DepartamentoFormularioComponent implements OnInit {
  protected urlAtual = this.activatedRoute.snapshot.url;
  protected carregando: boolean = false;
  protected confirmacaoAtiva: boolean = false;

  protected departamentoID: string = '';
  protected departamentoAtual!: IDepartamentoView;

  protected formularioDepartamento!: FormGroup;

  constructor(
    private departamentoService: DepartamentoService,
    private mensagemService: MensagemService,
    private fb: FormBuilder,
    private activatedRoute: ActivatedRoute,
    private router: Router,
  ) { }

  async ngOnInit(): Promise<void> {
    try {
      this.carregando = true;

      this.formularioDepartamento = this.fb.group({
        Departamento: ['', Validators.required],
        Ativo: [true, Validators.required]
      });

      if (this.urlAtual.length == 3) {
        this.departamentoID = this.activatedRoute.snapshot.paramMap.get('DepartamentoID') || '';
        this.departamentoAtual = await this.departamentoService.buscarDepartamento(this.departamentoID).toPromise() || {} as IDepartamentoView;

        this.formularioDepartamento.patchValue({
          Departamento: this.departamentoAtual.Departamento,
          Ativo: this.departamentoAtual.Ativo
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
    if (this.formularioDepartamento.valid) {
      this.carregando = true;

      const departamento: IDepartamentoForm = {
        Departamento: this.formularioDepartamento.get('Departamento')?.value,
        Ativo: this.formularioDepartamento.get('Ativo')?.value
      }

      const mensagemSucesso = this.urlAtual.length == 3
        ? 'Departamento editado!'
        : 'Departamento criado!';

      const errorMessage = (error: any) => {
        if (error.error) {
          return error.error.Mensagem;
        } else {
          return 'Erro no servidor, contate a TI para mais informações!';
        }
      }

      const serviceCall = this.urlAtual.length == 3
        ? this.departamentoService.atualizarDepartamento(this.departamentoID, departamento)
        : this.departamentoService.cadastrarDepartamento(departamento);

      serviceCall.subscribe(() => {
        this.mensagemService.adicionarMensagem(mensagemSucesso);
        this.router.navigate(['/Departamentos']);
      }, (error: any) => {
        this.mensagemService.adicionarMensagem(error.error.Resposta);
        console.log(error.error.Resposta);
        this.carregando = false;
      });
    }
  }

  protected alternarConfirmacao(): void {
    this.confirmacaoAtiva = !this.confirmacaoAtiva;
  }

  protected confirmarExclusao(): void {
    this.carregando = true;

    this.departamentoService.deletarDepartamento(this.departamentoID).subscribe(() => {
      this.mensagemService.adicionarMensagem('Departamento excluído!');
      this.router.navigate(['/Departamentos']);
    }, (error: any) => {
      this.mensagemService.adicionarMensagem(error.error.Resposta);
      console.error(error.error.Resposta);
      this.carregando = false;
    });
  }
}
