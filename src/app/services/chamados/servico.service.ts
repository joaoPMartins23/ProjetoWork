import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { timeout } from 'rxjs';

import { environment } from 'src/environments/environment';
import { IServico } from 'src/app/modules/chamados/service.interface';

@Injectable({
  providedIn: 'root'
})
export class ServicoService {
  private apiUrl: string = `${environment.apiUrlBase}/Servico`;

  constructor(
    private httpClient: HttpClient
  ) { }

  public buscarServicos(): Observable<IServico[]> {
    return this.httpClient.get<IServico[]>(`${this.apiUrl}`).pipe(timeout(125000));
  }

  public buscarServico(servicoID: string): Observable<IServico> {
    return this.httpClient.get<IServico>(`${this.apiUrl}/${servicoID}`).pipe(timeout(125000));
  }
}
