import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AutenticacaoService } from 'src/app/services/autenticacao.service';
import { ResetarSenhaService } from 'src/app/services/resetarSenha.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  protected carregando: boolean = false;

  protected formularioLogin!: FormGroup;

  protected formularioFoiSubmetido = false;

  protected mostrarSenha: boolean = false;

  protected recuperandoSenha = false;

  protected recuperacaoConcluida = false;

  protected erroLogar: string = "";

  constructor(
    private formBuilder: FormBuilder,
    private autenticacaoService: AutenticacaoService,
    protected resetarSenhaService: ResetarSenhaService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    localStorage.clear();

    this.formularioLogin = this.formBuilder.group({
      Email: ['', [Validators.required, Validators.email]],
      Senha: [''] // sem validação inicialmente, será ajustado
    });

    this.ajustarValidadores(); // define conforme o modo inicial
  }

  private ajustarValidadores(): void {
    const senhaControl = this.formularioLogin.get('Senha');

    if (this.recuperandoSenha) {
      senhaControl?.clearValidators();
    } else {
      senhaControl?.setValidators([Validators.required]);
    }

    senhaControl?.updateValueAndValidity();
  }

  protected alternarVisibilidadeSenha(): void {
    this.mostrarSenha = !this.mostrarSenha;
  }

  protected temErro(campo: string): boolean {
    const controle = this.formularioLogin.get(campo);
    return this.formularioFoiSubmetido && controle?.invalid!;
  }

  protected obterMensagemErro(campo: string): string {
    const ctrl = this.formularioLogin.get(campo);

    if (!ctrl || !ctrl.touched || !ctrl.errors) return '';

    if (campo === 'Email') {
      if (ctrl.hasError('required')) return 'E-mail é obrigatório';
      if (ctrl.hasError('email')) return 'E-mail inválido';
    }

    if (campo === 'Senha') {
      if (ctrl.hasError('required')) return 'Senha é obrigatória';
    }

    return '';
  }

  protected onSubmit(): void {
    this.formularioFoiSubmetido = true;

    if (this.formularioLogin.invalid) {
      this.formularioLogin.markAllAsTouched();
      return;
    }

    this.carregando = true;

    if (this.recuperandoSenha) {
      const email = this.formularioLogin.get('Email')?.value;
      this.resetarSenhaService.solicitarNovaSenha(email).subscribe({
        next: () => {
          this.recuperacaoConcluida = true;
          this.carregando = false;
        },
        error: () => {
          alert('Erro ao enviar e-mail.');
          this.carregando = false;
        }
      });
    } else {
      const email = this.formularioLogin.get('Email')?.value;
      const senha = this.formularioLogin.get('Senha')?.value;
      this.autenticacaoService.realizarAutenticacao(email, senha).subscribe({
        next: (res) => {
          this.carregando = false;
          this.router.navigate(['/Home'])
        },
        error: (err) => {
          console.log(err)
          this.erroLogar = err.error.Resposta;
          this.formularioLogin.get('Senha')?.setValue('');
          this.carregando = false;
        }
      });
    }
  }

  protected alternarModo(event: Event): void {
    event.preventDefault();
    this.recuperandoSenha = !this.recuperandoSenha;
    this.formularioFoiSubmetido = false;
    this.ajustarValidadores();
  }

  protected voltarParaLogin(): void {
    this.recuperandoSenha = false;
    this.recuperacaoConcluida = false;
    this.formularioLogin.reset();
    this.formularioFoiSubmetido = false;
    this.ajustarValidadores();
  }
}
