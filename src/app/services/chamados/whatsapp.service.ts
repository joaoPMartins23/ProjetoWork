import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { timeout } from 'rxjs';

import { environment } from 'src/environments/environment';
import { IWhatsappEnvio } from 'src/app/modules/chamados/whatsapp.interface';

@Injectable({
  providedIn: 'root'
})
export class WhatsappService {
  private apiUrl: string = `${environment.apiUrlBase}/Whatsapp/Enviar`;

  constructor(
    private httpClient: HttpClient
  ) { }

  public enviarMensagemWhatsApp(whatsappEnvio: IWhatsappEnvio): Observable<any> {
    return this.httpClient.post<any>(this.apiUrl, whatsappEnvio).pipe(timeout(125000));
  }
}
