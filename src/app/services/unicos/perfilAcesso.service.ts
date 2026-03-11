import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { timeout } from 'rxjs';

import { environment } from 'src/environments/environment';
import { IPerfilAcesso } from 'src/app/modules/unicos/perfilAcesso.interface';

@Injectable({
  providedIn: 'root'
})
export class PerfilAcessoService {
  private apiUrl: string = `${environment.apiUrlBase}/PerfilAcesso`;

  constructor(
    private httpClient: HttpClient
  ) { }

  public buscarPerfisAcesso(): Observable<IPerfilAcesso[]> {
    return this.httpClient.get<IPerfilAcesso[]>(`${this.apiUrl}`).pipe(timeout(125000));
  }

  public buscarPerfilAcesso(perfilAcessoID: string): Observable<IPerfilAcesso> {
    return this.httpClient.get<IPerfilAcesso>(`${this.apiUrl}/${perfilAcessoID}`).pipe(timeout(125000));
  }
}
