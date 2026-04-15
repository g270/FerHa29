import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/index';

@Component({
  selector: 'app-login',
  template: `
    <section class="auth-page">
      <form class="auth-card" (ngSubmit)="submit()">
        <h2>Iniciar sesion</h2>

        <label for="email">Email</label>
        <input id="email" type="email" [(ngModel)]="email" name="email" required />

        <label for="password">Contrasena</label>
        <input id="password" type="password" [(ngModel)]="password" name="password" required />

        <button type="submit" [disabled]="loading">{{ loading ? 'Ingresando...' : 'Ingresar' }}</button>
        <p class="error" *ngIf="error">{{ error }}</p>
      </form>
    </section>
  `,
  styles: [
    `
      .auth-page { min-height: 70vh; display: grid; place-items: center; }
      .auth-card { width: min(420px, 92vw); border: 1px solid #ddd; border-radius: 12px; padding: 1.25rem; display: grid; gap: 0.75rem; background: #fff; }
      label { font-weight: 600; }
      input { padding: 0.65rem 0.75rem; border: 1px solid #bbb; border-radius: 8px; }
      button { margin-top: 0.5rem; padding: 0.7rem 1rem; border: 0; border-radius: 8px; background: #1f7a8c; color: #fff; cursor: pointer; }
      button:disabled { opacity: 0.7; cursor: not-allowed; }
      .error { color: #b42318; margin: 0; }
    `
  ]
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(private authService: AuthService, private router: Router) {}

  submit(): void {
    this.loading = true;
    this.error = '';

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err: { error?: { message?: string } }) => {
        this.loading = false;
        this.error = err.error?.message || 'No se pudo iniciar sesion.';
      }
    });
  }
}
