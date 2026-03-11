import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { timeout } from 'rxjs';

import { environment } from 'src/environments/environment';
import { IProjetoView, IProjetoForm } from 'src/app/modules/cruds/cadastros/projeto.interface';

@Injectable({
  providedIn: 'root'
})
export class ProjetoService {
  private apiUrl: string = `${environment.apiUrlBase}/Projeto`;

  constructor(
    private httpClient: HttpClient
  ) { }

  public buscarProjetos(): Observable<IProjetoView[]> {
    return this.httpClient.get<IProjetoView[]>(`${this.apiUrl}`).pipe(timeout(125000));
  }

  public buscarProjeto(projetoID: string): Observable<IProjetoView> {
    return this.httpClient.get<IProjetoView>(`${this.apiUrl}/${projetoID}`).pipe(timeout(125000));
  }

  public cadastrarProjeto(projeto: IProjetoForm): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}`, projeto).pipe(timeout(125000));
  }

  public atualizarProjeto(projetoID: string, projeto: IProjetoForm): Observable<any> {
    return this.httpClient.put<any>(`${this.apiUrl}/${projetoID}`, projeto).pipe(timeout(125000));
  }
}
