/** Build the /docs/compose first screen in a clean Android consumer outside this repository.
 * Copies packages/ui-compose/ui in as a module, exactly as the docs tell readers to, and takes every
 * Gradle change and Kotlin file a reader adds from the docs' marked fences. The fixture owns only what an
 * existing app already has (namespace, manifest, repositories) plus Robolectric tests of the screen's
 * documented behaviour. Robolectric runs on the JVM: this is not device or emulator validation.
 *
 *   node scripts/adoption/compose-consumer.mjs                 build and test the docs as written
 *   node scripts/adoption/compose-consumer.mjs --negative=<id> apply one documented-step mutation and
 *                                                              require the gate to fail for that reason
 *   node scripts/adoption/compose-consumer.mjs --list-negatives
 *
 * Needs JDK 17+ and an Android SDK (ANDROID_HOME); Gradle downloads compileSdk and build tools.
 * Never publishes. The fixture is retained in the temp directory on failure for diagnosis.
 */
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// Each control breaks one thing a reader copies, and names the failure the gate must report.
// `from` must occur exactly once in that fence, so a control cannot silently become a no-op.
const NEGATIVES = {
  'missing-import': { fence: 'FirstScreen.kt', from: 'import androidx.compose.material3.Text\n', to: '',
    expect: /Unresolved reference 'Text'/ },
  'missing-component': { fence: 'FirstScreen.kt', from: 'KinetixSwitch(', to: 'KinetixToggleSwitch(',
    expect: /Unresolved reference 'KinetixToggleSwitch'/ },
  'missing-dependency': { fence: 'app/build.gradle.kts', from: '    implementation("androidx.compose.material3:material3")\n', to: '',
    expect: /Unresolved reference 'material3'|Unresolved reference 'Text'/ },
  'module-not-registered': { fence: 'settings.gradle.kts', from: 'include(":kinetixui-ui")\n', to: '',
    expect: /':kinetixui-ui'[^\n]*not( be)? found/ },
  'activity-not-wired': { fence: 'MainActivity.kt', from: 'import androidx.activity.compose.setContent\n', to: '',
    expect: /Unresolved reference 'setContent'/ },
  'validation-broken': { fence: 'FirstScreen.kt', from: '"@" !in email', to: 'false',
    expect: /FirstScreenTest > emailValidationBehavesAsDocumented FAILED/ },
  'switch-unresponsive': { fence: 'FirstScreen.kt', from: 'onCheckedChange = { updates = it }', to: 'onCheckedChange = {}',
    expect: /FirstScreenTest > switchTogglesWhenTapped FAILED/ },
  'switch-unnamed': { fence: 'FirstScreen.kt', from: '                    modifier = Modifier.semantics { contentDescription = "Product updates" },\n', to: '',
    expect: /FirstScreenTest > switchIsNamedByItsLabel FAILED/ },
  // The pattern PR #329's first fix used: merging the row does not reach the switch, because the
  // switch's own toggleable node is a merge boundary, so the label never names it.
  'switch-row-merge': { fence: 'FirstScreen.kt', edits: [
    ['                modifier = Modifier.fillMaxWidth(),\n', '                modifier = Modifier.fillMaxWidth().semantics(mergeDescendants = true) {},\n'],
    ['KinetixLabel(text = "Product updates", modifier = Modifier.clearAndSetSemantics {})', 'KinetixLabel(text = "Product updates")'],
    ['                    modifier = Modifier.semantics { contentDescription = "Product updates" },\n', ''],
  ], expect: /FirstScreenTest > switchIsNamedByItsLabel FAILED/ },
  'fence-missing': { fence: 'MainActivity.kt', from: '// MainActivity.kt', to: '// Activity.kt',
    expect: /Missing documented MainActivity\.kt example/ },
};

if (process.argv.includes('--list-negatives')) {
  console.log(Object.keys(NEGATIVES).join('\n'));
  process.exit(0);
}
const negativeId = process.argv.find(arg => arg.startsWith('--negative='))?.slice('--negative='.length);
const negative = negativeId && NEGATIVES[negativeId];
assert.ok(!negativeId || negative, `Unknown negative control ${negativeId}`);

const root = fileURLToPath(new URL('../../', import.meta.url));
const compose = join(root, 'packages/ui-compose');
const docs = readFileSync(join(root, 'apps/web/src/app/docs/compose/page.mdx'), 'utf8');
// Fences are identified by their first-line comment, e.g. "// FirstScreen.kt".
const blocks = [...docs.matchAll(/```kotlin\n([\s\S]*?)\n```/g)].map(m => m[1]);
if (negative) {
  const index = blocks.findIndex(text => text.split('\n')[0].startsWith(`// ${negative.fence}`));
  assert.ok(index >= 0, `Negative control ${negativeId}: no ${negative.fence} fence`);
  for (const [from, to] of negative.edits ?? [[negative.from, negative.to]]) {
    assert.equal(blocks[index].split(from).length, 2, `Negative control ${negativeId}: ${JSON.stringify(from)} must occur exactly once`);
    blocks[index] = blocks[index].replace(from, to);
  }
}

// Everything below runs inside `gate`, so a negative control can require the exact failure it expects.
const gate = () => {
  const fence = marker => {
    const block = blocks.find(text => text.split('\n')[0].startsWith(`// ${marker}`));
    if (!block) throw new Error(`Missing documented ${marker} example`);
    return block;
  };
  const fixture = mkdtempSync(join(tmpdir(), 'kinetixui-compose-consumer-'));
  const write = (path, text) => {
    mkdirSync(join(fixture, path, '..'), { recursive: true });
    writeFileSync(join(fixture, path), text);
  };
  const source = 'app/src/main/kotlin/com/example/consumer';
  // The app fence may carry its own plugins block; Gradle allows one per script, so merge it.
  const appFence = fence('app/build.gradle.kts');
  const appPlugins = appFence.match(/^plugins \{\n([\s\S]*?)\n\}\n/m);
  const appRest = appPlugins ? appFence.replace(appPlugins[0], '') : appFence;

  cpSync(join(compose, 'ui'), join(fixture, 'kinetixui-ui'), { recursive: true });
  cpSync(join(compose, 'gradle'), join(fixture, 'gradle'), { recursive: true });
  cpSync(join(compose, 'gradlew'), join(fixture, 'gradlew'));
  write('gradle.properties', 'org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\n');
  write('settings.gradle.kts', `pluginManagement {
    repositories { google(); mavenCentral(); gradlePluginPortal() }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral() }
}
rootProject.name = "kinetixui-compose-consumer"
include(":app")
${fence('settings.gradle.kts')}
`);
  write('build.gradle.kts', `${fence('build.gradle.kts (root)')}\n`);
  write('app/build.gradle.kts', `plugins {
    id("com.android.application")
${appPlugins ? appPlugins[1] : ''}
}
android {
    namespace = "com.example.consumer"
    defaultConfig {
        applicationId = "com.example.consumer"
        minSdk = 24
        targetSdk = 36
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlin { compilerOptions { jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17 } }
    testOptions { unitTests { isIncludeAndroidResources = true } }
}

${appRest}

// Fixture only: the Robolectric tests below.
dependencies {
    testImplementation(platform("androidx.compose:compose-bom:2026.09.00"))
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.17")
    testImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
tasks.withType<Test> {
    testLogging {
        events("passed", "failed")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
        showStandardStreams = true
    }
}
`);
  write('app/src/main/AndroidManifest.xml', `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:label="Consumer">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`);
  // The docs tell readers to add their own package line; the fixture's is com.example.consumer.
  write(`${source}/FirstScreen.kt`, `package com.example.consumer\n\n${fence('FirstScreen.kt')}\n`);
  write(`${source}/MainActivity.kt`, `package com.example.consumer\n\n${fence('MainActivity.kt')}\n`);
  write('app/src/test/kotlin/com/example/consumer/FirstScreenTest.kt', `package com.example.consumer

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsOff
import androidx.compose.ui.test.assertIsOn
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isToggleable
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.printToString
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** The documented screen's promised behaviour, composed through Robolectric on the JVM (not a device). */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class FirstScreenTest {
    @get:Rule
    val rule = createComposeRule()

    private val error = "Enter an email address."
    // The switch as assistive technology reaches it: one toggleable node carrying the label,
    // whether the label arrives as merged text or as a content description.
    private val namedSwitch = isToggleable() and (hasText("Product updates") or hasContentDescription("Product updates"))

    @Test
    fun emailValidationBehavesAsDocumented() {
        rule.setContent { FirstScreen() }
        rule.onNodeWithText(error).assertDoesNotExist()
        rule.onNodeWithText("Get started").performClick()
        rule.onNodeWithText(error).assertIsDisplayed()
        rule.onNode(hasSetTextAction()).performTextInput("ada@example.com")
        rule.onNodeWithText(error).assertDoesNotExist()
    }

    @Test
    fun switchIsNamedByItsLabel() {
        rule.setContent { FirstScreen() }
        println("KX-REPORT merged semantics tree:\\n" + rule.onRoot().printToString(maxDepth = Int.MAX_VALUE))
        rule.onNode(namedSwitch).assertExists().assertIsEnabled()
    }

    @Test
    fun switchTogglesWhenTapped() {
        rule.setContent { FirstScreen() }
        val toggle = rule.onNode(isToggleable())
        toggle.assertIsOn()
        toggle.performClick()
        toggle.assertIsOff()
        toggle.performClick()
        toggle.assertIsOn()
    }
}
`);
  console.log(`Clean Compose consumer: ${fixture}`);
  const gradle = spawnSync(join(fixture, 'gradlew'), ['--no-daemon', ':app:assembleDebug', ':app:testDebugUnitTest'],
    { cwd: fixture, encoding: 'utf8', maxBuffer: 1 << 28 });
  process.stdout.write(gradle.stdout ?? '');
  process.stderr.write(gradle.stderr ?? '');
  if (gradle.status !== 0) throw new Error(`Gradle failed (exit ${gradle.status})\n${gradle.stdout}\n${gradle.stderr}`);
  rmSync(fixture, { recursive: true });
};

if (!negative) {
  gate();
  console.log('PASS: documented Compose setup builds in a clean consumer app, and its first screen behaves as documented (Robolectric, JVM).');
} else {
  let failure;
  try { gate(); } catch (error) { failure = error; }
  assert.ok(failure, `Negative control ${negativeId}: the gate PASSED with the documented step broken`);
  assert.match(String(failure.message), negative.expect,
    `Negative control ${negativeId}: the gate failed, but not for the expected reason`);
  console.log(`PASS: negative control ${negativeId} fails the gate as expected (${negative.expect}).`);
}
