import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { timeout } from 'rxjs';

import { environment } from 'src/environments/environment';
import  { IChamadoForm, IChamadoRetornoForm, IChamadoView, IChamadoViewSimples } from 'src/app/modules/chamados/chamado.interface';

@Injectable({
  providedIn: 'root'
})
export class ChamadoService {
  private apiUrl: string = `${environment.apiUrlBase}/Chamado`;

  constructor(
    private httpClient: HttpClient
  ) { }

  public buscarChamados(): Observable<IChamadoViewSimples[]> {
    return this.httpClient.get<IChamadoViewSimples[]>(`${this.apiUrl}`).pipe(timeout(125000));
  }

  public buscarChamado(chamadoID: string): Observable<IChamadoView> {
    return this.httpClient.get<IChamadoView>(`${this.apiUrl}/${chamadoID}`).pipe(timeout(125000));
  }

  public criarChamado(chamado: IChamadoForm): Observable<IChamadoRetornoForm> {
    return this.httpClient.post<IChamadoRetornoForm>(`${this.apiUrl}`, chamado).pipe(timeout(125000));
  }

  public atualizarChamado(chamadoID: string, chamado: any): Observable<any> {
    return this.httpClient.put<any>(`${this.apiUrl}/${chamadoID}`, chamado).pipe(timeout(125000));
  }

  public reabrirChamado(chamadoID: string): Observable<any> {
    return this.httpClient.put<any>(`${this.apiUrl}/Reabrir/${chamadoID}`, {}).pipe(timeout(125000));
  }

  public responderPesquisaSatisfacao(chamadoID: string, nota: string): Observable<any> {
    return this.httpClient.put<any>(`${this.apiUrl}/ResponderPesquisa/${chamadoID}`, { "Nota": nota }).pipe(timeout(125000));
  }
}
