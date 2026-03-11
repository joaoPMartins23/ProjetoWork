import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { timeout } from 'rxjs';

import { environment } from 'src/environments/environment';
import { IUsuarioForm, IUsuarioView } from 'src/app/modules/cruds/cadastros/usuario.interface';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private apiUrl: string = `${environment.apiUrlBase}/Usuario`;

  constructor(
    private httpClient: HttpClient
  ) { }

  public buscarUsuarios(): Observable<IUsuarioView[]> {
    return this.httpClient.get<IUsuarioView[]>(`${this.apiUrl}`).pipe(timeout(125000));
  }

  public buscarUsuario(usuarioID: string): Observable<IUsuarioView> {
    return this.httpClient.get<IUsuarioView>(`${this.apiUrl}/${usuarioID}`).pipe(timeout(125000));
  }

  public cadastrarUsuario(usuario: IUsuarioForm): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}`, usuario).pipe(timeout(125000));
  }

  public atualizarUsuario(usuarioID: string, usuario: IUsuarioForm): Observable<any> {
    return this.httpClient.put<any>(`${this.apiUrl}/${usuarioID}`, usuario).pipe(timeout(125000));
  }

  public deletarUsuario(usuarioID: string): Observable<any> {
    return this.httpClient.delete<any>(`${this.apiUrl}/${usuarioID}`).pipe(timeout(125000));
  }
}
