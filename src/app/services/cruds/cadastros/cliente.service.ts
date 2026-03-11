import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { timeout } from 'rxjs';

import { environment } from 'src/environments/environment';
import { IClienteView, IClienteForm } from 'src/app/modules/cruds/cadastros/cliente.interface';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private apiUrl: string = `${environment.apiUrlBase}/Cliente`;

  constructor(
    private httpClient: HttpClient
  ) { }

  public buscarClientes(): Observable<IClienteView[]> {
    return this.httpClient.get<IClienteView[]>(`${this.apiUrl}`).pipe(timeout(125000));
  }

  public buscarCliente(clienteID: string): Observable<IClienteView> {
    return this.httpClient.get<IClienteView>(`${this.apiUrl}/${clienteID}`).pipe(timeout(125000));
  }

  public cadastrarCliente(cliente: IClienteForm): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}`, cliente).pipe(timeout(125000));
  }

  public cadastrarClientePorCpfCnpj(cpfCnpj: string, nomeCliente: string): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/${cpfCnpj}/${nomeCliente}`, {}).pipe(timeout(125000));
  }

  public atualizarCliente(clienteID: string, cliente: IClienteForm): Observable<any> {
    return this.httpClient.put<any>(`${this.apiUrl}/${clienteID}`, cliente).pipe(timeout(125000));
  }
}
