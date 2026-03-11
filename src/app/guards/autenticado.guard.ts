import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AutenticadoGuard implements CanActivate {

  constructor(
    private router: Router
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (localStorage.getItem('Token') && localStorage.getItem('RefreshToken') && localStorage.getItem('UsuarioID') && localStorage.getItem('PerfilAcesso') && localStorage.getItem('NomeUsuario') && localStorage.getItem('DepartamentoID') && localStorage.getItem('Imagem')) {
      return true;
    } else {
      this.router.navigate(['/Login']);
      return false;
    }
  }

}
