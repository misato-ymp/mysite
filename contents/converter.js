'use strict';

const fs = require('fs');
const path = require('path');
const marked = require('marked');
const highlight = require('highlight.js');
const colors = require('colors/safe');

/** marked settings */
const renderer = new marked.Renderer();
renderer.heading = (text, level) => {
  return `<h${level}>${text}</h${level}>`;
};

marked.setOptions({
  renderer: renderer,
  highlight (code) {
    return highlight.highlightAuto(code).value;
  },
});

/** constants */
const ARGV = Object.freeze({
  TARGET: {
    NAME: 'target',
    COMMAND: '-t',
    CORRECT_VALUES: ['pages', 'slides'],
  },
  FILE: {
    NAME: 'file',
    COMMAND: '-f',
  },
});

const PATH_INFO = Object.freeze({
  DIST: `${__dirname}/../static/contents`,
});

/** functions */
const extractArgv = (argv, command) => {
  let isExtract = false;
  return argv.filter((value) => {
    if (/^-/.test(value) === true) {
      isExtract = value === command;
      return false;
    }
    return isExtract;
  });
};

const verifyValues = (values, argObject) => {
  for (let value of values) {
    if (argObject.CORRECT_VALUES.includes(value) === false) {
      console.error(colors.red(`Error: Invalid value '${value}' in ${argObject.NAME}[${argObject.COMMAND}].`));
      process.exit();
    }
  }
};

const createTargets = (argTargets) => {
  let targets = [];
  if (argTargets.length === 0) {
    targets = Array.from(ARGV.TARGET.CORRECT_VALUES);
  } else {
    targets = Array.from(argTargets);
  }
  return targets;
};

const getFolderFileNames = (folderName) => {
  try {
    return fs.readdirSync(folderName);
  } catch (err) {
    console.error(colors.red(err));
    process.exit();
  }
};

const getTargetFileNames = (targets) => {
  const fileNames = {};
  for (let target of targets) {
    fileNames[target] = getFolderFileNames(path.join(__dirname, target));
  }
  return fileNames;
};

const getConvertFilePaths = (targetFileNames, argFileNames) => {
  let convertFileNames = [];
  const funcFilter = (() => {
    if (argFileNames.length === 0) {
      return () => {
        return true;
      };
    }
    return (fileName) => {
      return argFileNames.includes(fileName);
    };
  })();

  Object.keys(targetFileNames).forEach((folderName) => {
    const fileNames = targetFileNames[folderName];
    const tmpFileNames = fileNames.filter(funcFilter)
      .map((fileName) => `${folderName}/${fileName}`);
    convertFileNames = convertFileNames.concat(tmpFileNames);
  });
  return convertFileNames;
};

const verifyFilePaths = (fileNames) => {
  if (fileNames.length === 0) {
    console.error(colors.red('Error: No file to convert.'));
    process.exit();
  }
};

const changeExtensionMdToJson = (fileName) => {
  return fileName.replace(/\.md$/, '.json');
};

const extractTitle = (html) => {
  return html.match(/<h1>(.*?)<\/h1>/);
};

const extractDescription = (html) => {
  return html.match(/@@\n?(.*?)\n?@@/);
};

const removeEmptyPTag = (html) => {
  return html.replace(/<p>\s*<\/p>/, '');
};

const removeBeforeAndAfterNewLine = (html) => {
  return html.replace(/^\n*|\n*$/g, '');
};

const buildJson = (html) => {
  const [removeHtmlTitle, title] = extractTitle(html) || ['', ''];
  const [removeHtmlDesciption, description] = extractDescription(html) || ['', ''];
  html = html.replace(removeHtmlTitle, '').replace(removeHtmlDesciption, '');
  html = removeEmptyPTag(html);
  html = removeBeforeAndAfterNewLine(html);

  return {
    title: title,
    description: description,
    body: html,
  };
};

/** main process */
const argv = process.argv.filter((value, index) => index > 1);

// Targets
const argTargets = extractArgv(argv, ARGV.TARGET.COMMAND);
verifyValues(argTargets, ARGV.TARGET);
const targets = createTargets(argTargets);
console.info(colors.cyan(`Target Folders: ${targets.join(', ')}`));

// File Names
const targetFileNames = getTargetFileNames(targets);
const argFileNames = extractArgv(argv, ARGV.FILE.COMMAND);
const filePaths = getConvertFilePaths(targetFileNames, argFileNames);
verifyFilePaths(filePaths);
console.info(colors.cyan(`Files to convert: ${filePaths.join(', ')}`));

// Convert
for (let filePath of filePaths) {
  try {
    let fileData = fs.readFileSync(path.join(__dirname, filePath)).toString();
    let html = marked(fileData);
    let json = JSON.stringify(buildJson(html));
    let saveFilePath = changeExtensionMdToJson(filePath);
    fs.writeFileSync(path.join(PATH_INFO.DIST, saveFilePath), json);
  } catch (error) {
    console.error(colors.red(error));
    process.exit();
  }
}

console.info(colors.green('Completed.'));
