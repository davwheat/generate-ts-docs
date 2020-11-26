import * as ts from 'typescript'

import { ParametersJsDocData } from '../../types'
import { traverseNode } from './find-node'
import { findFirstChildNodeOfKind } from './operations/find-first-child-node-of-kind'

export function parseJsDocComment(
  node: ts.Node
): null | {
  description: null | string
  parameters: null | ParametersJsDocData
  returnType: null | string
  tags: null | ParametersJsDocData
} {
  const jsDocCommentNode = traverseNode(node, [
    findFirstChildNodeOfKind(ts.SyntaxKind.JSDocComment)
  ])
  if (jsDocCommentNode === null) {
    return {
      description: null,
      parameters: null,
      returnType: null,
      tags: null
    }
  }
  const tags = parseTags(jsDocCommentNode)
  if (tags !== null && typeof tags.ignore !== 'undefined') {
    // has `@ignore` tag, so return null
    return null
  }
  const description = (jsDocCommentNode as ts.JSDoc).comment
  const returnType = parseReturnTypeDescription(jsDocCommentNode)
  const parameters = parseParameterDescriptions(jsDocCommentNode)
  return {
    description:
      typeof description === 'undefined' ? null : normalizeText(description),
    parameters,
    returnType:
      typeof returnType === 'undefined' || returnType === null
        ? null
        : returnType,
    tags
  }
}

function parseReturnTypeDescription(node: ts.Node): null | string {
  const jsDocReturnTagNode = traverseNode(node, [
    findFirstChildNodeOfKind(ts.SyntaxKind.JSDocReturnTag)
  ])
  if (jsDocReturnTagNode === null) {
    return null
  }
  const returnTypeDescription = (jsDocReturnTagNode as ts.JSDocReturnTag)
    .comment
  if (typeof returnTypeDescription === 'undefined') {
    return null
  }
  return returnTypeDescription
}

function parseParameterDescriptions(node: ts.Node): null | ParametersJsDocData {
  const jsDocParameterTagNodes = node
    .getChildren()
    .filter(function (node: ts.Node) {
      return node.kind === ts.SyntaxKind.JSDocParameterTag
    })
  return jsDocParameterTagNodes.length === 0
    ? null
    : parseJsDocTagNodes(jsDocParameterTagNodes, 1)
}

function parseTags(node: ts.Node): null | ParametersJsDocData {
  const jsDocTagNodes = node.getChildren().filter(function (node: ts.Node) {
    return node.kind === ts.SyntaxKind.JSDocTag
  })
  return jsDocTagNodes.length === 0
    ? null
    : parseJsDocTagNodes(jsDocTagNodes, 0)
}

function parseJsDocTagNodes(
  jsDocTagNodes: Array<ts.Node>,
  keyIndex: number
): ParametersJsDocData {
  const result: ParametersJsDocData = {}
  for (const jsDocTagNode of jsDocTagNodes) {
    const key = jsDocTagNode.getChildAt(keyIndex).getText()
    const comment = (jsDocTagNode as ts.JSDocTag).comment
    result[key] = typeof comment === 'undefined' ? null : normalizeText(comment)
  }
  return result
}

function normalizeText(text: string) {
  return text
    .replace(/\n+/g, function (match: string) {
      if (match.length === 1) {
        return ' '
      }
      return match
    })
    .trim()
}
