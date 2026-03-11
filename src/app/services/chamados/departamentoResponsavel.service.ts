import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { timeout } from 'rxjs';

import { environment } from 'src/environments/environment';
import { IDepartamentoResponsavel } from 'src/app/modules/chamados/departamentoResponsavel.interface';

@Injectable({
  providedIn: 'root'
})
export class DepartamentoResponsavelService {
  private apiUrl: string = `${environment.apiUrlBase}/DepartamentoResponsavel`;

  constructor(
    private httpClient: HttpClient
  ) { }

  public buscarDepartamentosResponsaveis(): Observable<IDepartamentoResponsavel[]> {
    return this.httpClient.get<IDepartamentoResponsavel[]>(`${this.apiUrl}`).pipe(timeout(125000));
  }

  public buscarDepartamentoResponsavel(departamentoResponsavelID: string): Observable<IDepartamentoResponsavel> {
    return this.httpClient.get<IDepartamentoResponsavel>(`${this.apiUrl}/${departamentoResponsavelID}`).pipe(timeout(125000));
  }
}
