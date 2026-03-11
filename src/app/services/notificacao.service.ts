import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { timeout } from 'rxjs';

import { environment } from 'src/environments/environment';
import { INotificacaoForm, INotificacaoView } from '../modules/notificacao.interface';

@Injectable({
  providedIn: 'root'
})
export class NotificacaoService {
  private apiUrl: string = `${environment.apiUrlBase}/Notificacao`;

  constructor(
    private httpClient: HttpClient
  ) { }

  public buscarNotificacoesPorUsuario(usuarioID: string): Observable<INotificacaoView[]> {
    return this.httpClient.get<INotificacaoView[]>(`${this.apiUrl}/${usuarioID}`).pipe(timeout(125000));
  }

  public criarNotificacao(notificacao: INotificacaoForm): Observable<any> {
    return this.httpClient.post<any>(this.apiUrl, notificacao).pipe(timeout(125000));
  }

  public marcarNotificacaoComoLida(notificacaoID: string): Observable<any> {
    return this.httpClient.put<any>(`${this.apiUrl}/Atualizar/${notificacaoID}`, {}).pipe(timeout(125000));
  }

  public marcarNotificacoesUsuarioChamadoComoLidas(usuarioID: string, chamadoID: string): Observable<any> {
    return this.httpClient.put<any>(`${this.apiUrl}/AtualizarUsuarioChamadoComoLida/${usuarioID}/${chamadoID}`, {}).pipe(timeout(125000));
  }

  public marcarTodasNotificacoesUsuarioComoLidas(usuarioID: string): Observable<any> {
    return this.httpClient.put<any>(`${this.apiUrl}/AtualizarTodasNotificacoes/${usuarioID}`, {}).pipe(timeout(125000));
  }
}
