import '@analogjs/vite-plugin-angular/setup-vitest';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

// Only the environment is set up globally. The testing MODULE is configured per test (see `host()` in the spec),
// because TestBed refuses to be reconfigured once instantiated and several tests render more than one tree.
// Zoneless: the package ships no zone.js dependency and nothing in it relies on one, so the tests run the way a
// modern Angular application does.
getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
