/* 
The extension "InsertNums" is an adoption of a wonderful plugin for
Sublimecode from James Brooks.
https://github.com/jbrooksuk/InsertNums

All errors are in my own responsibility and are solley done by
myself.

If you want to contact me, send an E-Mail to 
insertnums.extension@volker-dobler.de

Volker Dobler
November 2019
 */



// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
// import * as d3 from 'd3-format';

var d3 = require('d3-format');

var sprintf = require('sprintf-js').sprintf;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "insertnums" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.insertNums', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
    // vscode.window.showInformationMessage("Hello World");
		InsertNumsCommand();
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

function intOrFloat(value: any): number {
  return Number.isInteger(value) ? parseInt(value) : parseFloat(value);
}

function numToAlpha(num : number, len : number = 0) : string {
  let res: string = "";
  
  if (len > 0) {
    num = (num - 1) % Math.pow(26, len) + 1;
  }
  
  while (num > 0) {
    --num;
    res = String.fromCharCode(97 + (num % 26)) + res;
    num = Math.floor(num/26);
  }
  
  return res;
}

function alphaToNum(alpha: string) : number {
  
  let res: number = 0;
  
  for (let i = 0; i < alpha.length; i++) {
    res *= 26;
    res += alpha.charCodeAt(i) - 96;
  }
  
  return res;
}

function getRegexps() {
  let ruleTemplate = {
    integer: "[1-9]\\d* | 0",
    signedint: "[+-]? {integer}",
    pointfloat: "({integer})? \\. \\d+ | {integer} \\.",
    exponentfloat: "(?:{integer} | {pointfloat}) [eE] [+-]? \\d+",
    float: "{pointfloat} | {exponentfloat}",
    numeric: "{integer} | {float}",
    signednum: "[+-]? {numeric}",
    format: "((?<format_padding> [^}}])?(?<format_align> [<>=^]))?(?<format_sign> [-+ ])?\#?(?<format_filled> 0)?(?<format_integer> {integer})?(\\.(?<format_precision> \\d+))?(?<format_type> [bcdeEfFgGnoxX%])?",
    alphastart: "[a-z]+ | [A-Z]+",
    alphaformat: "([^}}]?[<>=^])?({integer})?",
    cast: "[ifsb]",
    expr: ".+?",
    stopexpr: ".+?",
    exprmode: "^(?<cast> {cast})?\\|(~ (?<format> {format} ::))? (?<expr> {expr}) (@(?<stopexpr> {stopexpr}))?(?<reverse> !)? $",
    insertnum: "^(?<start> {signednum})? (:(?<step> {signednum}))? (~(?<format> {format}))?(::(?<expr> {expr}))? (@ (?<stopexpr> {stopexpr}) )? (?<reverse> !)? $",
    insertalpha: "^(?<start> {alphastart})(: (?<step> {signedint}) )? (~ (?<format> {alphaformat})(?<wrap> w)?)?(@(?<stopexpr> {stopexpr}) )?(?<reverse> !)?$"
  };
  
  let result = {
    exprmode: "",
    insertnum: "",
    insertalpha: ""
  };
  
  for ( let [key,value] of Object.entries(ruleTemplate) ) {
    while (value.indexOf("{") > -1) {
      let start:number = value.indexOf("{");
      let ende:number = value.indexOf("}",start+1)+1;
      let replace:string = value.slice(start,ende);
      let rule:string = replace.slice(1,replace.length-1);
      value = value.replace(replace,(ruleTemplate as any)[rule]);
    }
    (result as any)[key] = value.replace(/\s/gi,"");
  }
  
  return result;
}

function status(msg: any) {
  console.log("Meldung: " + msg);
}

function InsertNumsCommand() {
  let document = vscode.window;
  
  if (vscode === undefined || vscode.window === undefined || vscode.window.activeTextEditor === undefined) {
    vscode.window.showErrorMessage("Extension only available with active Texteditor");
    return null;
  }

  let selections = vscode.window.activeTextEditor !== undefined ? vscode.window.activeTextEditor.selections : null;

  if (selections === null) { return null; }

  let selLen = selections.length;
  
  document.showInputBox({ prompt: "Enter format string (default: '1:1')", placeHolder: "1:1"})
    .then((result:any) => {
      
      if (result === undefined) { return null; }
      
      let eingabe = (result.length > 0) ? result : "1:1";
      
      let {insertnum, insertalpha, exprmode} = getRegexps();
      const numreg = new RegExp(insertnum,"gi");
      const alphareg = new RegExp(insertalpha,"gi");
      const exprreg = new RegExp(exprmode,"gi");

      let matchNum = numreg.exec(eingabe);
      let matchAlpha = alphareg.exec(eingabe);
      let matchExpr = exprreg.exec(eingabe);
      
      let groups;
      
      if (matchNum) {
// @ts-ignore
        groups = matchNum.groups;
      } else if (matchAlpha) {
// @ts-ignore
        groups = matchAlpha.groups;
      } else if (matchExpr) {
// @ts-ignore
        groups = matchExpr.groups;
      } else {
        vscode.window.showErrorMessage("Format string not valid" + result);
        return null;
      }
      
      const EXPRMODE = groups !== undefined && (! Object.prototype.hasOwnProperty.call(groups,'start'));
      const ALPHA = groups !== undefined && Object.prototype.hasOwnProperty.call(groups,'wrap');
      const REVERSE = (groups as any).reverse === "!";
      const step = groups !== undefined && Object.prototype.hasOwnProperty.call(groups,'step') && (groups as any).step !== undefined ? intOrFloat((groups as any).step) : 1;
      const expr = (! ALPHA) && (groups as any).expr !== undefined;
      const stop_expr = (groups as any).stopexpr;
      const cast = EXPRMODE && (groups as any).cast !== undefined ? (groups as any).cast : "s";
      const UPPER = ALPHA && (groups as any).start[0] === (groups as any).start[0].toUpperCase();
      const WRAP = ALPHA && (groups as any).wrap === "w";
      const format = (groups as any).format !== undefined ? (groups as any).format : "";
      
      const format_padding = (groups as any).format_padding;
      const format_align = (groups as any).format_align;
      const format_sign = (groups as any).format_sign;
      const format_filled = (groups as any).format_filled;
      const format_integer = (groups as any).format_integer;
      const format_precision = (groups as any).format_precision;
      const format_type = (groups as any).format_type;
      
      // let decimals = ((groups as any).step && (groups as any).step.indexOf(".") > -1) ? (((groups as any).step.length - (groups as any).step.indexOf(".") - 1) <= 20 ? (groups as any).step.length - (groups as any).step.indexOf(".") - 1 : 20) : 0;
      
      let values:any = [];
      let value:any = 0;
      let lenVal:number = 0;
      
      if (EXPRMODE) {
      } else if (! ALPHA) {
        if ((groups as any).start !== undefined) {
          value = Number((groups as any).start);
        }
        // if ((format && format.indexOf('.')) || (+step !== (+step|0))) {
          // decimals = Math.max((format.length - format.indexOf('.') - 1), (step.toString().length - step.toString().indexOf('.') - 1),decimals);
        // }
      } else {
        value = alphaToNum(String((groups as any).start).toLocaleLowerCase());
        lenVal = WRAP ? value.toString().length : 0;
      }
      
      let evalValue:any = 0;
      let replace:any;
      
      let i:number = 0;
      let skip:boolean = false;
      let evalStr:string = "";
      
      let startTime = Date.now();
      let timeLimit = 1000;  // max. 1 second in the while loop
      
      let casttable = {
        s: function(value:any) { return String(value); },
        b: function(value:any) { return Boolean(value); },
        i: function(value:any) { return (Number(value) === (Number(value)|0)) ? Number(value) : null; },
        f: function(value:any) { return (Number(value) !== (Number(value)|0)) ? Number(value) : null; }
      };

      let WSP = new vscode.WorkspaceEdit();

      while (true) {
        if ((EXPRMODE || (stop_expr === undefined)) && (vscode.window.activeTextEditor !== undefined && vscode.window.activeTextEditor.selections.length === i)) {
          break;
        }
        if (Date.now() > startTime + timeLimit) {
          // vscode.window.showInformationMessage(`Time limit of ${timeLimit}s exceeded`);
          // break;
        }
        if (EXPRMODE) {
          let range = ((selections !== null) ? ((! REVERSE) ? selections[i] : selections.pop()) : null) as vscode.Range;
          if (vscode.window.activeTextEditor !== undefined) {
            value = vscode.window.activeTextEditor.document.getText(range);
          }
          try {
// @ts-ignore
            value = casttable[cast](value);
          }
          catch(e) {
// @ts-ignore
            vscode.window.showErrorMessage(`[${value}] could not be cast to ${casttable[cast]}`);
            return null;
          }
        }
        if (! skip) {
          if (expr || (stop_expr !== undefined)) {
            (groups as any).step = "";
          }
          if (ALPHA) {
            evalValue = numToAlpha(value, lenVal);
            if (UPPER) {
              String(evalValue).toLocaleUpperCase();
            }
          } else {
            if (expr) {
              value = value !== null ? value : "";
              evalStr = (groups as any).expr.replace(/_/g,value).replace(/s/gi,step).replace(/n/gi,selLen).replace(/p/gi,evalValue).replace(/c/gi,evalValue).replace(/i/gi,i+1);
              try {
                evalValue = eval(evalStr);
                // if (parseFloat(evalValue)) {
                  // evalValue = decimals > 0 ? evalValue.toFixed(decimals) : evalValue;
                // }
              }
              catch(e) {
                vscode.window.showErrorMessage(`[${(groups as any).expr}] Invalid Expression. Exception is: ` + e);
                return null;
              }
            } else {
              if (matchNum) {
                evalValue = value;
              } else if (matchAlpha) {
                evalValue = numToAlpha(value, lenVal);
              } else {
                evalValue = value;
              }
            }
          }
          
          if (stop_expr !== undefined) {
            evalStr = stop_expr.replace(/_/g,value).replace(/s/gi,step).replace(/n/gi,selLen).replace(/p/gi,evalValue).replace(/c/gi,evalValue).replace(/i/gi,i+1);
            try {
              if (eval(evalStr)) { break; }
            }
            catch(e) {
              vscode.window.showErrorMessage(`[${stop_expr}] Invalid Stop Expression. Exception is: ` + e);
              return null;
            }
          }
          if (format) {
            let preFormat = "%";
            if (format_sign !== undefined) { preFormat += format_sign; }
            if (format_padding !== undefined) { preFormat += "'" + format_padding; }
            if (format_align !== undefined) { if (format_align === "<") { preFormat += "-"; } }
            if (format_filled !== undefined) { preFormat += format_filled; }
            if (format_integer !== undefined) { preFormat += format_integer; }
            if (format_precision !== undefined) { 
              preFormat += "." + format_precision; 
              // decimals = format_precision; 
            }
            if (format_type !== undefined) { 
              preFormat += format_type; 
            } else { 
              if (format_precision !== undefined) { // || decimals > 0) {
                preFormat += "g";
              } else {
                preFormat += "d"; 
              }
            }

            // if (matchAlpha) {
              // replace = sprintf(preFormat, evalValue.toFixed(decimals)); 
            // };
            if (matchNum) {
              replace = d3.format(format)(evalValue);
            }

          } else {
            replace = evalValue; // String(decimals > 0 ? evalValue.toFixed(decimals) : evalValue);
          }
        }
        
        values.push((! skip) ? replace : String(value));
        
        if (! EXPRMODE) {
          value += +step;
          // value.toFixed(decimals);
        }
        i += 1;
        skip = false;
      }
      
      if (EXPRMODE) {
        if (selections !== null) {
          if (REVERSE) {
            selections.reverse();
          }
          selections.forEach(function(element, index) {
            if (index === values.length) {
              return;
            }
             if (vscode.window.activeTextEditor !== undefined) {
              WSP.replace(vscode.window.activeTextEditor.document.uri,element,values[index]);
            }
          });
          vscode.workspace.applyEdit(WSP);
        }
      } else {
        let text:string = "";
        
        if (selections !== null) {
          selections.forEach(function (element, index) {
            if (index >= values.length) {
              text = "";
            } else if ((index === selLen) && (values.length > selLen)) {
              let other = (! REVERSE) ? values.slice(index) : values.slice(0,-index-1);
              text = other.join("\n");
            } else {
              text = REVERSE ? values[values.length-index-1] : values[index];
            }
            if (vscode.window.activeTextEditor !== undefined) {
              WSP.replace(vscode.window.activeTextEditor.document.uri,element,text);
            }
          });
          vscode.workspace.applyEdit(WSP);
        }
      }
      
      // vscode.window.showInformationMessage("Eingegeben: " + eingabe);
    });

}