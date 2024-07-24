import { build, emptyDir } from 'https://deno.land/x/dnt@0.37.0/mod.ts'

await emptyDir('./npm')

await build({
  entryPoints: ['./mod.ts', './react.ts', './preact.ts'],
  outDir: './npm',
  shims: {},
  compilerOptions: {
    lib: ['DOM', 'DOM.Iterable'],
  },
  importMap: 'deno.json',
  typeCheck: false,
  skipSourceOutput: false,
  test: false,
  scriptModule: false,
  package: {
    // package.json properties
    name: '@westbrookdaniel/form',
    version: Deno.args[0],
    description: 'Framework agnostic uncontrolled form utilities',
    license: 'MIT',
    repository: {
      type: 'git',
      url: 'git+https://github.com/westbrookdaniel/form.git',
    },
  },
  postBuild() {
    // steps to run after building and before running the tests
    Deno.copyFileSync('LICENSE', 'npm/LICENSE')
    Deno.copyFileSync('README.md', 'npm/README.md')

    // package changes
    // change dependencies to peerDependencies
    const pkg = JSON.parse(Deno.readTextFileSync('npm/package.json'))
    pkg.peerDependencies = pkg.dependencies
    delete pkg.dependencies
    // map dependencies to peerDependenciesMeta
    pkg.peerDependenciesMeta = {}
    for (const [key] of Object.entries<any>(pkg.peerDependencies)) {
      pkg.peerDependenciesMeta[key] = { optional: true }
    }
    // remove extension specifiers from exports and add types
    for (const [key, value] of Object.entries<any>(pkg.exports)) {
      const newKey = key.replace(/\.js$/, '')
      pkg.exports[newKey] = value
      value.types = value.import.replace(/\.js$/, '.d.ts')
      if (newKey !== key) delete pkg.exports[key]
    }
    Deno.writeTextFileSync('npm/package.json', JSON.stringify(pkg, null, 2))
  },
})
