import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { timeout } from 'rxjs';

import { environment } from 'src/environments/environment';
import { IProduto } from 'src/app/modules/chamados/produto.interface';

@Injectable({
  providedIn: 'root'
})
export class ProdutoService {
  private apiUrl: string = `${environment.apiUrlBase}/Produto`;

  constructor(
    private httpClient: HttpClient
  ) { }

  public buscarProdutos(): Observable<IProduto[]> {
    return this.httpClient.get<IProduto[]>(`${this.apiUrl}`).pipe(timeout(125000));
  }
}
