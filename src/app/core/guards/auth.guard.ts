import { CanActivateFn, Router } from "@angular/router";
import { inject } from "@angular/core";
import { filter, take } from "rxjs";
import { AuthService } from "../services/auth.service";

export const authGuard: CanActivateFn = (_route, _state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // Trigger session check in parallel with route component mount
  authService.initAuthCheck();

  if (authService.authReady()) {
    return authService.isAuthenticated() ? true : router.createUrlTree(['/login']);
  }

  authService.authReady$
    .pipe(
      filter((ready) => ready),
      take(1),
    )
    .subscribe(() => {
      if (!authService.isAuthenticated()) {
        router.navigate(['/login']);
      }
    });

  return true;
};
