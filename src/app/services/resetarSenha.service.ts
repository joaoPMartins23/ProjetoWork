import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";
import * as CryptoJS from 'crypto-js';

import { timeout } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ResetarSenhaService {
  private apiUrl: string = `${environment.apiUrlBase}/RecuperacaoSenha`;
  private chavePrivada = environment.chavePrivada;

  constructor(
    private httpClient: HttpClient
  ) { }

  public solicitarNovaSenha(Email: string): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/Solicitar`, { Email }).pipe(timeout(125000));
  }

  public redefinirSenha(Token: string, NovaSenha: string): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/Redefinir`, { Token, NovaSenha }).pipe(timeout(125000));
  }
}
