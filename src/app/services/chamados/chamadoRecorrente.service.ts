import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

import { Observable } from 'rxjs';
import { IChamadoRecorrenteForm, IChamadoRecorrenteRetornoForm, IChamadoRecorrenteView } from 'src/app/modules/chamados/chamadoRecorrente.interface';

@Injectable({ providedIn: 'root' })
export class ChamadoRecorrenteService {
  private baseUrl = `${environment.apiUrlBase}/ChamadoRecorrente`;

  constructor(private http: HttpClient) {}

  criarChamadoRecorrente(model: IChamadoRecorrenteForm): Observable<IChamadoRecorrenteRetornoForm> {
    return this.http.post<IChamadoRecorrenteRetornoForm>(`${this.baseUrl}`, model);
  }

  buscarChamadosRecorrentes(): Observable<IChamadoRecorrenteView[]> {
    return this.http.get<IChamadoRecorrenteView[]>(`${this.baseUrl}`);
  }

  buscarChamadoRecorrente(id: string): Observable<IChamadoRecorrenteView> {
    return this.http.get<IChamadoRecorrenteView>(`${this.baseUrl}/${id}`);
  }

  ativar(id: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/Ativar/${id}`, null);
  }

  desativar(id: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/Desativar/${id}`, null);
  }
}
