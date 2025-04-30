plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "com.pakivpn.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.pakivpn.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
}

dependencies {

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.activity)
    implementation(libs.androidx.constraintlayout)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}

tasks.register("webBuild") {
    group = "build"
    description = "Builds the web frontend with webpack"
    doLast {
        exec {
            workingDir = rootProject.projectDir
            commandLine = if (System.getProperty("os.name").toLowerCase().contains("windows")) {
                listOf("cmd", "/c", "npm run web:build")
            } else {
                listOf("npm", "run", "web:build")
            }
        }
    }
}

// Перед сборкой приложения вызываем webBuild
tasks.named("preBuild") {
    dependsOn("webBuild")
}