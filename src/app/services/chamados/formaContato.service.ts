import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { timeout } from 'rxjs';

import { environment } from 'src/environments/environment';
import { IFormaContato } from 'src/app/modules/chamados/formaContato.interface';

@Injectable({
  providedIn: 'root'
})
export class FormaContatoService {
  private apiUrl: string = `${environment.apiUrlBase}/FormaContato`;

  constructor(
    private httpClient: HttpClient
  ) { }

  public buscarFormasContato(): Observable<IFormaContato[]> {
    return this.httpClient.get<IFormaContato[]>(`${this.apiUrl}`).pipe(timeout(125000));
  }

  public buscarFormaContato(formaContatoID: string): Observable<IFormaContato> {
    return this.httpClient.get<IFormaContato>(`${this.apiUrl}/${formaContatoID}`).pipe(timeout(125000));
  }

  public cadastrarFormaContato(formaContato: IFormaContato): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}`, formaContato).pipe(timeout(125000));
  }

  public atualizarFormaContato(formaContatoID: string, formaContato: IFormaContato): Observable<any> {
    return this.httpClient.put<any>(`${this.apiUrl}/${formaContatoID}`, formaContato).pipe(timeout(125000));
  }

  public deletarFormaContato(formaContatoID: string): Observable<any> {
    return this.httpClient.delete<any>(`${this.apiUrl}/${formaContatoID}`).pipe(timeout(125000));
  }
}
