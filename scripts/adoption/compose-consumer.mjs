/** Build the /docs/compose first screen in a clean Android consumer outside this repository.
 * Copies packages/ui-compose/ui in as a module, exactly as the docs tell readers to, and takes every
 * Gradle change and Kotlin file a reader adds from the docs' marked fences. The fixture owns only what an
 * existing app already has (namespace, manifest, repositories) plus one Robolectric test of the screen.
 * Needs JDK 17+ and an Android SDK (ANDROID_HOME); Gradle downloads compileSdk and build tools.
 * Never publishes. The fixture is retained in the temp directory on failure for diagnosis.
 */
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const compose = join(root, 'packages/ui-compose');
const fixture = mkdtempSync(join(tmpdir(), 'kinetixui-compose-consumer-'));
const docs = readFileSync(join(root, 'apps/web/src/app/docs/compose/page.mdx'), 'utf8');
// Fences are identified by their first-line comment, e.g. "// FirstScreen.kt".
const fence = marker => {
  const blocks = [...docs.matchAll(/```kotlin\n([\s\S]*?)\n```/g)].map(m => m[1]);
  const block = blocks.find(text => text.split('\n')[0].startsWith(`// ${marker}`));
  assert.ok(block, `Missing documented ${marker} example`);
  return block;
};
const write = (path, text) => {
  mkdirSync(join(fixture, path, '..'), { recursive: true });
  writeFileSync(join(fixture, path), text);
};
const source = 'app/src/main/kotlin/com/example/consumer';

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
    id("org.jetbrains.kotlin.plugin.compose")
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

${fence('app/build.gradle.kts')}

// Fixture only: the Robolectric test below.
dependencies {
    testImplementation(platform("androidx.compose:compose-bom:2026.09.00"))
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.17")
    testImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
tasks.withType<Test> { testLogging { events("passed", "failed"); showStandardStreams = true } }
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

import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsOff
import androidx.compose.ui.test.assertIsOn
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isToggleable
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTextInput
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

    @Test
    fun documentedScreenValidatesAndToggles() {
        rule.setContent { FirstScreen() }
        val error = "Enter an email address."
        rule.onNodeWithText(error).assertDoesNotExist()
        rule.onNodeWithText("Get started").performClick()
        rule.onNodeWithText(error).assertIsDisplayed()
        rule.onNode(hasSetTextAction()).performTextInput("ada@example.com")
        rule.onNodeWithText(error).assertDoesNotExist()

        // One merged switch node, named by its visible label, as assistive technology reads it.
        val updates = rule.onNode(hasText("Product updates") and isToggleable())
        updates.assertIsOn().assertIsEnabled()
        updates.performSemanticsAction(SemanticsActions.OnClick)
        updates.assertIsOff()

        // Reported, not asserted: what the email field exposes to assistive technology.
        println("KX-REPORT email field semantics: " + rule.onNode(hasSetTextAction()).fetchSemanticsNode().config)
    }
}
`);
console.log(`Clean Compose consumer: ${fixture}`);
execFileSync(join(fixture, 'gradlew'), ['--no-daemon', ':app:assembleDebug', ':app:testDebugUnitTest'],
  { cwd: fixture, stdio: 'inherit' });
console.log('PASS: documented Compose first screen assembles in a clean consumer and behaves as described.');
if (!process.argv.includes('--keep')) rmSync(fixture, { recursive: true });
