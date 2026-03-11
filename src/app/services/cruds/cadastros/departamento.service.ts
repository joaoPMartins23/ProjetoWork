import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { timeout } from 'rxjs';

import { environment } from 'src/environments/environment';
import { IDepartamentoForm, IDepartamentoView } from 'src/app/modules/cruds/cadastros/departamento.interface';

@Injectable({
  providedIn: 'root'
})
export class DepartamentoService {
  private apiUrl: string = `${environment.apiUrlBase}/Departamento`;

  constructor(
    private httpClient: HttpClient
  ) { }

  public buscarDepartamentos(): Observable<IDepartamentoView[]> {
    return this.httpClient.get<IDepartamentoView[]>(`${this.apiUrl}`).pipe(timeout(125000));
  }

  public buscarDepartamento(departamentoID: string): Observable<IDepartamentoView> {
    return this.httpClient.get<IDepartamentoView>(`${this.apiUrl}/${departamentoID}`).pipe(timeout(125000));
  }

  public cadastrarDepartamento(departamento: IDepartamentoForm): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}`, departamento).pipe(timeout(125000));
  }

  public atualizarDepartamento(departamentoID: string, departamento: IDepartamentoForm): Observable<any> {
    return this.httpClient.put<any>(`${this.apiUrl}/${departamentoID}`, departamento).pipe(timeout(125000));
  }

  public deletarDepartamento(departamentoID: string): Observable<any> {
    return this.httpClient.delete<any>(`${this.apiUrl}/${departamentoID}`).pipe(timeout(125000));
  }
}
