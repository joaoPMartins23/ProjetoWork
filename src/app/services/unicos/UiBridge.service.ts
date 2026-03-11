import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UiBridgeService {
  // "evento" para abrir o overlay de edição de usuário no menu
  private _openUserEdit$ = new Subject<void>();
  openUserEdit$ = this._openUserEdit$.asObservable();

  openUserEditOverlay() {
    this._openUserEdit$.next();
  }
}
