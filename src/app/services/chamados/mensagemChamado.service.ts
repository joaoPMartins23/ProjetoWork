import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { timeout } from 'rxjs';

import { environment } from 'src/environments/environment';
import { IMensagem } from 'src/app/modules/chamados/mensagem.interface';

@Injectable({
  providedIn: 'root'
})
export class MensagemChamadoService {
  private apiUrl: string = `${environment.apiUrlBase}/Mensagem`;

  constructor(
    private httpClient: HttpClient
  ) { }

  public criarMensagemPorChamado(chamadoID: string, mensagem: IMensagem): Observable<IMensagem> {
    return this.httpClient.post<IMensagem>(`${this.apiUrl}/${chamadoID}`, mensagem).pipe(timeout(125000));
  }

  public atualizarMensagem(mensagemID: string, mensagem: IMensagem): Observable<void> {
    return this.httpClient.put<void>(`${this.apiUrl}/${mensagemID}`, mensagem).pipe(timeout(125000));
  }
}
