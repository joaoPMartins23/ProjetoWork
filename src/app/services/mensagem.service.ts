import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MensagemService {
  mensagem: string = '';

  constructor() { }

  public adicionarMensagem(mensagem: string) {
    this.mensagem = mensagem;

    setTimeout(() => {
      this.limparMensagem();
    }, 15000);
  }

  public limparMensagem() {
    this.mensagem = '';
  }
}
