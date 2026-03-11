import { Injectable } from '@angular/core';
import {
  HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse
} from '@angular/common/http';
import { Observable, catchError, switchMap, tap, throwError } from 'rxjs';
import { AutenticacaoService } from './services/autenticacao.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private refreshInProgress: boolean = false;

  constructor(private authService: AutenticacaoService) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();

    let authReq = req;
    if (token) {
      authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !this.refreshInProgress) {
          this.refreshInProgress = true;

          return this.authService.refreshToken().pipe(
            switchMap(novoToken => {
              this.refreshInProgress = false;

              const novaReq = req.clone({
                headers: req.headers.set('Authorization', `Bearer ${novoToken}`)
              });

              return next.handle(novaReq);
            }),
            catchError(err => {
              this.refreshInProgress = false;

              this.authService.logout();
              return throwError(() => err);
            })
          );
        }

        return throwError(() => error);
      })
    );
  }
}
