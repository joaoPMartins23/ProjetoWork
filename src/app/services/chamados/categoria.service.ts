import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { timeout } from 'rxjs';

import { environment } from 'src/environments/environment';
import { ICategoria } from 'src/app/modules/chamados/categoria.interface';

@Injectable({
  providedIn: 'root'
})
export class CategoriaService {
  private apiUrl: string = `${environment.apiUrlBase}/Categoria`;

  constructor(
    private httpClient: HttpClient
  ) { }

  public buscarCategorias(): Observable<ICategoria[]> {
    return this.httpClient.get<ICategoria[]>(`${this.apiUrl}`).pipe(timeout(125000));
  }

  public buscarCategoria(categoriaID: string): Observable<ICategoria> {
    return this.httpClient.get<ICategoria>(`${this.apiUrl}/${categoriaID}`).pipe(timeout(125000));
  }

  public cadastrarCategoria(categoria: ICategoria): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}`, categoria).pipe(timeout(125000));
  }

  public atualizarCategoria(categoriaID: string, categoria: ICategoria): Observable<any> {
    return this.httpClient.put<any>(`${this.apiUrl}/${categoriaID}`, categoria).pipe(timeout(125000));
  }

  public deletarCategoria(categoriaID: string): Observable<any> {
    return this.httpClient.delete<any>(`${this.apiUrl}/${categoriaID}`).pipe(timeout(125000));
  }
}
