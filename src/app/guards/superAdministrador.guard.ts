import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import * as CryptoJS from 'crypto-js';

import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SuperAdministradorGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const perfilCriptografado = localStorage.getItem('PerfilAcesso');
    let perfilId: string | null = null;

    perfilId = CryptoJS.AES.decrypt(perfilCriptografado?? '', environment.chavePrivada).toString(CryptoJS.enc.Utf8);

    if (perfilId === 'SuperAdministrador') {
      return true;
    }

    alert("Ops! Você não tem permissão para acessar esta página. Entre em contato com um administrador para obter ajuda.");
    this.router.navigate(['/']); // volta pra home
    return false;
  }
}
