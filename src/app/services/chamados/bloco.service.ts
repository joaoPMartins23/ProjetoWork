import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { timeout } from 'rxjs';

import { environment } from 'src/environments/environment';
import { IBloco } from 'src/app/modules/chamados/bloco.interface';

@Injectable({
  providedIn: 'root'
})
export class BlocoService {
  private apiUrl: string = `${environment.apiUrlBase}/Bloco`;

  constructor(
    private httpClient: HttpClient
  ) { }

  public buscarBlocos(): Observable<IBloco[]> {
    return this.httpClient.get<IBloco[]>(`${this.apiUrl}`).pipe(timeout(125000));
  }

  public buscarBloco(blocoID: string): Observable<IBloco> {
    return this.httpClient.get<IBloco>(`${this.apiUrl}/${blocoID}`).pipe(timeout(125000));
  }
}
