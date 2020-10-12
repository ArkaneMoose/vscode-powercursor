import {
  commands,
  window,
  ExtensionContext,
  TextDocument,
  Position,
  Range,
  Selection,
  TextEditor,
} from 'vscode';

const SEARCH_CHUNK_SIZE = 256;

function findPrevious(document: TextDocument, needle: string, end: Position) {
  const chunk = Math.max(SEARCH_CHUNK_SIZE, needle.length * 2);
  const shift = chunk - needle.length + 1;
  let lastSearchRange = new Range(end, end);
  let searchRange = new Range(
    document.positionAt(document.offsetAt(end) - chunk),
    end,
  );

  while (searchRange.start.isBefore(lastSearchRange.start)) {
    const index = document.getText(searchRange).lastIndexOf(needle);
    if (index !== -1) {
      const offset = document.offsetAt(searchRange.start) + index;
      return new Range(
        document.positionAt(offset),
        document.positionAt(offset + needle.length),
      );
    }

    const searchRangeEndOffset = document.offsetAt(searchRange.end) - shift;
    const searchRangeStartOffset = searchRangeEndOffset - chunk;
    lastSearchRange = searchRange;
    searchRange = new Range(
      document.positionAt(searchRangeStartOffset),
      document.positionAt(searchRangeEndOffset),
    );
  }
}

function findNext(document: TextDocument, needle: string, start: Position) {
  const chunk = Math.max(SEARCH_CHUNK_SIZE, needle.length * 2);
  const shift = chunk - needle.length + 1;
  let lastSearchRange = new Range(start, start);
  let searchRange = new Range(
    start,
    document.positionAt(document.offsetAt(start) + chunk),
  );

  while (searchRange.end.isAfter(lastSearchRange.end)) {
    const index = document.getText(searchRange).indexOf(needle);
    if (index !== -1) {
      const offset = document.offsetAt(searchRange.start) + index;
      return new Range(
        document.positionAt(offset),
        document.positionAt(offset + needle.length),
      );
    }

    const searchRangeStartOffset = document.offsetAt(searchRange.start) + shift;
    const searchRangeEndOffset = searchRangeStartOffset + chunk;
    lastSearchRange = searchRange;
    searchRange = new Range(
      document.positionAt(searchRangeStartOffset),
      document.positionAt(searchRangeEndOffset),
    );
  }
}

function createMultifindCommand(
  callback: (
    document: TextDocument,
    selection: Selection,
    needle: string,
  ) => Selection,
) {
  return (editor: TextEditor) => {
    const { selections, document } = editor;
    const inputBox = window.createInputBox();
    let accepted = false;
    inputBox.placeholder = 'Enter search string';
    inputBox.onDidChangeValue((needle) => {
      editor.selections = needle
        ? selections.map((selection) => callback(document, selection, needle))
        : selections;
    });
    inputBox.onDidAccept(() => {
      accepted = true;
      inputBox.dispose();
    });
    inputBox.onDidHide(() => {
      if (!accepted) {
        editor.selections = selections;
      }
      inputBox.dispose();
    });
    inputBox.show();
  };
}

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerTextEditorCommand(
      'vscode-powercursor.selectNext',
      createMultifindCommand((document, selection, needle) => {
        const range = findNext(document, needle, selection.end);
        return range ? new Selection(range.start, range.end) : selection;
      }),
    ),
    commands.registerTextEditorCommand(
      'vscode-powercursor.selectPrevious',
      createMultifindCommand((document, selection, needle) => {
        const range = findPrevious(document, needle, selection.start);
        return range ? new Selection(range.end, range.start) : selection;
      }),
    ),
    commands.registerTextEditorCommand(
      'vscode-powercursor.selectToNext',
      createMultifindCommand((document, selection, needle) => {
        const range = findNext(document, needle, selection.end);
        return range ? new Selection(selection.start, range.end) : selection;
      }),
    ),
    commands.registerTextEditorCommand(
      'vscode-powercursor.selectToPrevious',
      createMultifindCommand((document, selection, needle) => {
        const range = findPrevious(document, needle, selection.start);
        return range ? new Selection(selection.end, range.start) : selection;
      }),
    ),
  );
}
