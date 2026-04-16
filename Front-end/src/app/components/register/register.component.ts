import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/index';

@Component({
  selector: 'app-register',
  standalone: false,
  template: `
    <section class="auth-page">
      <form class="auth-card" (ngSubmit)="submit()">
        <h2>Crear cuenta</h2>

        <div class="role-switch">
          <button type="button" [class.active]="userType === 'client'" (click)="userType = 'client'">Cliente</button>
          <button type="button" [class.active]="userType === 'seller'" (click)="userType = 'seller'">Proveedor</button>
        </div>

        <label for="firstName">Nombre</label>
        <input id="firstName" type="text" [(ngModel)]="firstName" name="firstName" required />

        <label for="lastName">Apellido</label>
        <input id="lastName" type="text" [(ngModel)]="lastName" name="lastName" required />

        <label for="email">Email</label>
        <input id="email" type="email" [(ngModel)]="email" name="email" required />

        <label for="password">Contrasena</label>
        <input id="password" type="password" [(ngModel)]="password" name="password" required minlength="6" />

        <label for="phone">Telefono</label>
        <input id="phone" type="text" [(ngModel)]="phone" name="phone" />

        <label for="address">Direccion</label>
        <input id="address" type="text" [(ngModel)]="address" name="address" />

        <p class="helper" *ngIf="userType === 'seller'">La cuenta se registrará como proveedor para habilitar publicación y panel de negocio.</p>

        <button type="submit" [disabled]="loading">{{ loading ? 'Creando...' : 'Registrarme' }}</button>
        <p class="error" *ngIf="error">{{ error }}</p>
      </form>
    </section>
  `,
  styles: [
    `
      .auth-page { min-height: 70vh; display: grid; place-items: center; }
      .auth-card { width: min(460px, 92vw); border: 1px solid #ddd; border-radius: 12px; padding: 1.25rem; display: grid; gap: 0.7rem; background: #fff; }
      .role-switch { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-bottom: 0.25rem; }
      .role-switch button { margin-top: 0; background: #ede9fe; color: #5B21B6; }
      .role-switch button.active { background: #5B21B6; color: white; }
      label { font-weight: 600; }
      input { padding: 0.65rem 0.75rem; border: 1px solid #bbb; border-radius: 8px; }
      button { margin-top: 0.5rem; padding: 0.7rem 1rem; border: 0; border-radius: 8px; background: #1f7a8c; color: #fff; cursor: pointer; }
      button:disabled { opacity: 0.7; cursor: not-allowed; }
      .helper { margin: 0; color: #5b21b6; font-size: 0.92rem; }
      .error { color: #b42318; margin: 0; }
    `
  ]
})
export class RegisterComponent {
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  phone = '';
  address = '';
  userType: 'client' | 'seller' = 'client';
  loading = false;
  error = '';

  constructor(private authService: AuthService, private router: Router) {}

  submit(): void {
    this.loading = true;
    this.error = '';

    this.authService
      .register({
        email: this.email,
        password: this.password,
        firstName: this.firstName,
        lastName: this.lastName,
        phone: this.phone || undefined,
        address: this.address || undefined,
        userType: this.userType
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/dashboard']);
        },
        error: (err: { error?: { message?: string } }) => {
          this.loading = false;
          this.error = err.error?.message || 'No se pudo completar el registro.';
        }
      });
  }
}
