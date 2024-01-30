/* eslint-disable import/no-extraneous-dependencies */
import { green, blue } from 'picocolors'
import fs from 'fs'
import path from 'path'

export function isFolderEmpty(root: string, name: string): boolean {
  const validFiles = [
    '.DS_Store',
    '.git',
    '.gitattributes',
    '.gitignore',
    '.gitlab-ci.yml',
    '.hg',
    '.hgcheck',
    '.hgignore',
    '.idea',
    '.npmignore',
    '.travis.yml',
    'LICENSE',
    'Thumbs.db',
    'docs',
    'mkdocs.yml',
    'npm-debug.log',
    'yarn-debug.log',
    'yarn-error.log',
    'yarnrc.yml',
    '.yarn',
  ]

  // Just conflicts? why not filesConflicts?
  // It is inferred that we are dealing with files,
  // I guess, there's no need to add 
  const conflicts = fs.readdirSync(root).filter(
    (file) =>
      // validFiles are exempt from the logging
      !validFiles.includes(file) &&
      // Support IntelliJ IDEA-based editors
      !/\.iml$/.test(file)
  )

  if (conflicts.length > 0) {
    console.log(
      `The directory ${green(name)} contains files that could conflict:`
    )
    console.log()
    // Logs the files and directories
    for (const file of conflicts) {
      try {
        const stats = fs.lstatSync(path.join(root, file))
        if (stats.isDirectory()) {
          console.log(`  ${blue(file)}/`)
        } else {
          console.log(`  ${file}`)
        }
      } catch {
        console.log(`  ${file}`)
      }
    }
    console.log()
    console.log(
      'Either try using a new directory name, or remove the files listed above.'
    )
    console.log()
    return false
  }

  return true
}
