import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { catchError, Observable, switchMap, tap, throwError } from "rxjs";
import * as CryptoJS from 'crypto-js';

import { timeout } from 'rxjs';
import { IAutenticacao } from '../modules/autenticacao.interface';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AutenticacaoService {
  private apiUrl: string = `${environment.apiUrlBase}/Autenticacao`;
  private chavePrivada = environment.chavePrivada;

  private usuarioAutenticado!: IAutenticacao;

  constructor(
    private httpClient: HttpClient,
    private router: Router
  ) { }

  public realizarAutenticacao(Email: string, Senha: string): Observable<any> {
    localStorage.clear();

    return this.httpClient.post(this.apiUrl, { Email, Senha }, { observe: "response" }).pipe(timeout(125000), tap(res => {
      this.usuarioAutenticado = JSON.parse(JSON.stringify(res.body));

      const acessToken = CryptoJS.AES.encrypt(this.usuarioAutenticado.AccessToken, this.chavePrivada).toString();
      //const acessToken = CryptoJS.AES.encrypt("Top", this.chavePrivada).toString();
      const refreshToken = CryptoJS.AES.encrypt(this.usuarioAutenticado.RefreshToken, this.chavePrivada).toString();
      const imagem = CryptoJS.AES.encrypt((this.usuarioAutenticado.Usuario.Imagem ?? ''), this.chavePrivada).toString();
      const usuarioID = CryptoJS.AES.encrypt(this.usuarioAutenticado.Usuario.UsuarioID, this.chavePrivada).toString();
      const nome = CryptoJS.AES.encrypt(this.usuarioAutenticado.Usuario.Nome, this.chavePrivada).toString();
      const departamentoID = CryptoJS.AES.encrypt(this.usuarioAutenticado.Usuario.DepartamentoID, this.chavePrivada).toString();
      const perfilAcesso = CryptoJS.AES.encrypt(this.usuarioAutenticado.Usuario.PerfilAcesso, this.chavePrivada).toString();
      const telefone = CryptoJS.AES.encrypt(this.usuarioAutenticado.Usuario.Telefone, this.chavePrivada).toString();

      localStorage.setItem('Token', acessToken);
      localStorage.setItem('RefreshToken', refreshToken);
      localStorage.setItem('UsuarioID', usuarioID);
      localStorage.setItem('NomeUsuario', nome);
      localStorage.setItem('DepartamentoID', departamentoID);
      localStorage.setItem('Imagem', imagem);
      localStorage.setItem('PerfilAcesso', perfilAcesso);
      localStorage.setItem('Telefone', telefone);

      if (this.usuarioAutenticado.Usuario.DepartamentoResponsavelID != null) {
        const departamentoResponsavelID = CryptoJS.AES.encrypt(this.usuarioAutenticado.Usuario.DepartamentoResponsavelID, this.chavePrivada).toString();
        localStorage.setItem('DepartamentoResponsavelID', departamentoResponsavelID);
      }
    }));
  }

  public getToken(): string | null {
    const tokenCripto = localStorage.getItem('Token');
    return tokenCripto
      ? CryptoJS.AES.decrypt(tokenCripto, this.chavePrivada).toString(CryptoJS.enc.Utf8)
      : null;
  }

  public refreshToken(): Observable<string> {
    const refreshCripto = localStorage.getItem('RefreshToken');
    const RefreshToken = refreshCripto
      ? CryptoJS.AES.decrypt(refreshCripto, this.chavePrivada).toString(CryptoJS.enc.Utf8)
      : '';

    return this.httpClient.post<any>(`${environment.apiUrlBase}/RefreshToken`, { RefreshToken }).pipe(
      tap(res => {
        localStorage.setItem('Token', CryptoJS.AES.encrypt(res.AccessToken, this.chavePrivada).toString());
        localStorage.setItem('RefreshToken', CryptoJS.AES.encrypt(res.RefreshToken, this.chavePrivada).toString());
      }),
      switchMap(res => [res.AccessToken]),
      catchError(err => {
        return throwError(() => err); // repassa erro para o interceptor lidar
      })
    );

  }

  public logout(): void {
    localStorage.removeItem('Token');
    localStorage.removeItem('RefreshToken');
    localStorage.removeItem('NomeUsuario');
    localStorage.removeItem('PerfilAcesso');
    localStorage.removeItem('DepartamentoID');
    localStorage.removeItem('UsuarioID');

    sessionStorage.clear();

    this.router.navigate(['/Login']);
  }
}
