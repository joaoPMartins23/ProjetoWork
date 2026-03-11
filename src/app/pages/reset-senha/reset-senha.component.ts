import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { set } from 'date-fns';

import { ResetarSenhaService } from 'src/app/services/resetarSenha.service';

@Component({
  selector: 'app-reset-senha',
  templateUrl: './reset-senha.component.html',
  styleUrl: './reset-senha.component.scss'
})
export class ResetSenhaComponent implements OnInit {
  protected carregando: boolean = false;

  protected formularioRecuperacao!: FormGroup;
  protected formularioFoiSubmetido = false;

  protected mostrarNovaSenha = false;
  protected mostrarConfirmarSenha = false;

  protected token: string = '';

  protected mensagemErro: string = "";

  protected senhaAlterada: boolean = false;

  protected erroTokenAberto: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private resetarSenhaService: ResetarSenhaService,
    private activatedRoute: ActivatedRoute,
    protected router: Router,
  ) { }

  ngOnInit(): void {
    this.token = this.activatedRoute.snapshot.queryParamMap.get('token') ?? '';

    this.formularioRecuperacao = this.formBuilder.group({
      NovaSenha: ['', Validators.required],
      ConfirmarSenha: ['', Validators.required]
    }, { validators: this.senhasIguaisValidator });
  }

  protected temErro(campo: string): boolean {
    const control = this.formularioRecuperacao.get(campo);

    if (!this.formularioFoiSubmetido) return false;

    // Se for o campo ConfirmarSenha e erro for de senhas diferentes
    if (campo === 'ConfirmarSenha' && this.formularioRecuperacao.hasError('senhasDiferentes')) {
      return true;
    }

    return control?.invalid ?? false;
  }

  protected obterMensagemErro(campo: string): string {
    const ctrl = this.formularioRecuperacao.get(campo);

    if (!this.formularioFoiSubmetido || !ctrl) return '';

    if (campo === 'NovaSenha' && ctrl.hasError('required')) {
      return 'Nova senha é obrigatória';
    }

    if (campo === 'ConfirmarSenha') {
      if (ctrl.hasError('required')) {
        return 'Confirmação de senha é obrigatória';
      }
      if (this.formularioRecuperacao.hasError('senhasDiferentes')) {
        return 'As senhas não coincidem';
      }
    }

    return '';
  }

  private senhasIguaisValidator(group: AbstractControl): ValidationErrors | null {
    const nova = group.get('NovaSenha')?.value;
    const confirmar = group.get('ConfirmarSenha')?.value;

    return nova === confirmar ? null : { senhasDiferentes: true };
  }

  protected alternarVisibilidade(campo: 'nova' | 'confirmar') {
    if (campo === 'nova') {
      this.mostrarNovaSenha = !this.mostrarNovaSenha;
    } else {
      this.mostrarConfirmarSenha = !this.mostrarConfirmarSenha;
    }
  }

  protected onSubmit(): void {
    this.formularioFoiSubmetido = true;
    this.carregando = true;

    if (this.formularioRecuperacao.invalid) return;

    const novaSenha = this.formularioRecuperacao.get('NovaSenha')?.value;
    const tokenFinal = this.token;;

    this.resetarSenhaService.redefinirSenha(tokenFinal, novaSenha).subscribe({
      next: () => {
        this.carregando = false;
        this.senhaAlterada = true;
      },
      error: (err) => {
        this.mensagemErro = err.error.mensagem;
        this.abrirErroToken();
        //this.formularioRecuperacao.get('NovaSenha')?.setValue('');
        //this.formularioRecuperacao.get('ConfirmarSenha')?.setValue('');
        this.carregando = false;
      }
    });
  }

  protected abrirErroToken(): void {
    this.erroTokenAberto = true;

    setTimeout(() => {
      this.erroTokenAberto = false;
    }, 15000);
  }
}
