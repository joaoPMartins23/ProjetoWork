import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { timeout } from 'rxjs';

import { environment } from 'src/environments/environment';
import { IHistoricoChamado } from 'src/app/modules/chamados/historicoChamado.interface';

@Injectable({
  providedIn: 'root'
})
export class HistoricoChamadoService {
  private apiUrl: string = `${environment.apiUrlBase}/HistoricoChamado`;

  constructor(
    private httpClient: HttpClient
  ) { }

  public buscarHistoricoChamado(chamadoID: string): Observable<IHistoricoChamado[]> {
    return this.httpClient.get<IHistoricoChamado[]>(`${this.apiUrl}/${chamadoID}`).pipe(timeout(125000));
  }
}
