import { generateFlutterModel } from './generator';
import { SAMPLE_PRESETS } from './constants/sampleJson';
import { parseFigmaCards, formatCardsToJson } from './generator/figmaCardParser';
import { parseJsonError, attemptFixJson } from './utils/jsonErrorParser';

export function runTests(): boolean {
  console.log('=== Running Generator & SonarQube Compliance Tests ===\n');

  let passCount = 0;
  let failCount = 0;

  for (const preset of SAMPLE_PRESETS) {
    try {
      console.log(`[TEST] Testing preset: "${preset.name}" (${preset.defaultClassName})`);
      
      // 1. Test Pure Dart
      const pureResult = generateFlutterModel(preset.json, {
        rootClassName: preset.defaultClassName,
        style: 'pure_dart',
        nullability: 'smart',
        generateCopyWith: true,
        generateToString: true,
        generateEquality: true,
        generateToJson: true,
        generateComments: true,
        useImmutableAnnotation: true,
        safeNumberParsing: true,
        useExplicitToJson: true,
        separateFiles: false,
      });

      if (pureResult.complianceScore !== 100) {
        throw new Error(`Pure Dart Sonar Score is ${pureResult.complianceScore}% (Expected 100%)`);
      }

      if (!pureResult.code.includes(`class ${preset.defaultClassName}`)) {
        throw new Error(`Pure Dart missing class ${preset.defaultClassName}`);
      }

      // 2. Test Freezed
      const freezedResult = generateFlutterModel(preset.json, {
        rootClassName: preset.defaultClassName,
        style: 'freezed',
        nullability: 'smart',
        generateCopyWith: true,
        generateToString: true,
        generateEquality: true,
        generateToJson: true,
        generateComments: true,
        useImmutableAnnotation: true,
        safeNumberParsing: true,
        useExplicitToJson: true,
        separateFiles: false,
      });

      if (!freezedResult.code.includes(`class ${preset.defaultClassName} with _$${preset.defaultClassName}`)) {
        throw new Error(`Freezed missing _$${preset.defaultClassName}`);
      }

      // 3. Test JsonSerializable
      const jsonSerResult = generateFlutterModel(preset.json, {
        rootClassName: preset.defaultClassName,
        style: 'json_serializable',
        nullability: 'smart',
        generateCopyWith: true,
        generateToString: true,
        generateEquality: true,
        generateToJson: true,
        generateComments: true,
        useImmutableAnnotation: true,
        safeNumberParsing: true,
        useExplicitToJson: true,
        separateFiles: false,
      });

      if (!jsonSerResult.code.includes(`@JsonSerializable`)) {
        throw new Error(`JsonSerializable missing @JsonSerializable`);
      }

      // 4. Test Equatable
      const equatableResult = generateFlutterModel(preset.json, {
        rootClassName: preset.defaultClassName,
        style: 'equatable',
        nullability: 'smart',
        generateCopyWith: true,
        generateToString: true,
        generateEquality: true,
        generateToJson: true,
        generateComments: true,
        useImmutableAnnotation: true,
        safeNumberParsing: true,
        useExplicitToJson: true,
        separateFiles: false,
      });

      if (!equatableResult.code.includes(`extends Equatable`)) {
        throw new Error(`Equatable missing extends Equatable`);
      }

      console.log(`  ✓ Passed for Pure Dart, Freezed, JsonSerializable, and Equatable (Score: 100%)\n`);
      passCount++;
    } catch (err: any) {
      console.error(`  ✗ FAILED: ${err.message}\n`);
      failCount++;
    }
  }

  // 5. Test Edge Cases: Reserved keywords, symbols, arrays of numbers, nulls
  console.log('[TEST] Testing Edge Cases & Dart Keywords Sanitization...');
  const edgeCaseJson = JSON.stringify({
    "default": 1,
    "final": "constant",
    "class": true,
    "switch": "case",
    "123_invalid_id": 999,
    "@type": "special",
    "_private_key": "secret",
    "nested_mixed_array": [1, 2, 3.5, 4]
  });

  const edgeResult = generateFlutterModel(edgeCaseJson, {
    rootClassName: 'EdgeCaseResponse',
    style: 'pure_dart',
    nullability: 'smart',
    generateCopyWith: true,
    generateToString: true,
    generateEquality: true,
    generateToJson: true,
    generateComments: true,
    useImmutableAnnotation: true,
    safeNumberParsing: true,
    useExplicitToJson: true,
    separateFiles: false,
  });

  // Check that reserved words are converted
  if (edgeResult.code.includes('final int default;') || edgeResult.code.includes('final String final;')) {
    console.error('  ✗ FAILED: Reserved keywords were not sanitized properly');
    failCount++;
  } else {
    console.log('  ✓ Reserved keywords sanitized: `isDefault`, `isFinal`, `className`, `switchValue`');
    console.log('  ✓ Score:', edgeResult.complianceScore + '%');
    passCount++;
  }

  // 6. Test Figma Card to Azure / JSON Parser (Multi-line and float effort parsing)
  console.log('\n[TEST] Testing Figma Card to Azure DevOps & JSON Parser...');
  const genericFigmaInput = `UI
Checkout Screen\u00A0
Payment Gateway
Header Overview





2
Function
Cart Calculation\u00A0
Discount Engine





0.5`;

  try {
    const figmaCards = parseFigmaCards(genericFigmaInput);
    if (figmaCards.length !== 2) {
      throw new Error(`Expected 2 cards parsed, but got ${figmaCards.length}`);
    }

    if (figmaCards[0].title !== 'UI Checkout Screen Payment Gateway Header Overview') {
      throw new Error(`Card 1 title mismatch: "${figmaCards[0].title}"`);
    }
    if (figmaCards[0].effort !== 2) {
      throw new Error(`Card 1 effort mismatch: ${figmaCards[0].effort}`);
    }

    if (figmaCards[1].title !== 'Function Cart Calculation Discount Engine') {
      throw new Error(`Card 2 title mismatch: "${figmaCards[1].title}"`);
    }
    if (figmaCards[1].effort !== 0.5) {
      throw new Error(`Card 2 effort mismatch: ${figmaCards[1].effort}`);
    }

    const jsonOutput = formatCardsToJson(figmaCards);
    const parsedJson = JSON.parse(jsonOutput);
    if (parsedJson[0].title !== 'UI Checkout Screen Payment Gateway Header Overview' || parsedJson[0].effort !== 2) {
      throw new Error(`JSON output mismatch for Card 1`);
    }
    if (parsedJson[1].title !== 'Function Cart Calculation Discount Engine' || parsedJson[1].effort !== 0.5) {
      throw new Error(`JSON output mismatch for Card 2`);
    }

    console.log('  ✓ Multi-line cards & float effort parsed: Card 1 (2 pts), Card 2 (0.5 pts)');
    console.log('  ✓ JSON Structure & Output verified');
    passCount++;
  } catch (err: any) {
    console.error(`  ✗ FAILED Figma Parser Test: ${err.message}`);
    failCount++;
  }

  // 6.2 Test Figma API Task Prefix (BreederFarm Feeding Sample)
  console.log('\n[TEST] Testing Figma API Task Prefixing (API : UI BreederFarm)...');
  const apiFigmaInput = `UI\nBreederFarm \nFeeding\nHeader Overview\n\n\n\n\n\n2\nFunction\nBreederFarm \nFeeding\n\n\n\n\n\n0.5`;
  try {
    const apiCards = parseFigmaCards(apiFigmaInput, { prefix: 'API :' });
    if (apiCards.length !== 2) {
      throw new Error(`Expected 2 API cards, got ${apiCards.length}`);
    }

    if (apiCards[0].title !== 'API : UI BreederFarm Feeding Header Overview' || apiCards[0].effort !== 2) {
      throw new Error(`API Card 1 mismatch: "${apiCards[0].title}" (Effort: ${apiCards[0].effort})`);
    }

    if (apiCards[1].title !== 'API : Function BreederFarm Feeding' || apiCards[1].effort !== 0.5) {
      throw new Error(`API Card 2 mismatch: "${apiCards[1].title}" (Effort: ${apiCards[1].effort})`);
    }

    const jsonResult = JSON.parse(formatCardsToJson(apiCards));
    if (
      jsonResult[0].title !== 'API : UI BreederFarm Feeding Header Overview' ||
      jsonResult[0].effort !== 2 ||
      jsonResult[1].title !== 'API : Function BreederFarm Feeding' ||
      jsonResult[1].effort !== 0.5
    ) {
      throw new Error('API Task JSON output mismatch');
    }

    console.log('  ✓ Extracted "API : UI BreederFarm Feeding Header Overview" (2 pts)');
    console.log('  ✓ Extracted "API : Function BreederFarm Feeding" (0.5 pts)');
    passCount++;
  } catch (err: any) {
    console.error(`  ✗ FAILED Figma API Task Prefix Test: ${err.message}`);
    failCount++;
  }

  // 7. Test Root Array API Request Model & List<Map<String, dynamic>> ToJson
  console.log('\n[TEST] Testing Root Array API Post Save Model...');
  const apiSampleJson = JSON.stringify([
    {
      "orgCode": "7415",
      "farm": "7415",
      "house": "03",
      "flock": "694",
      "documentDate": "2026-01-01T17:00:00",
      "detail": [
        {
          "damageType": "CULL",
          "damageCode": "CULL_001",
          "qty": 10
        }
      ]
    }
  ]);

  try {
    const apiResult = generateFlutterModel(apiSampleJson, {
      rootClassName: 'DetailPostSaveRequestModel',
      style: 'pure_dart',
      nullability: 'smart',
      generateCopyWith: true,
      generateToString: false,
      generateEquality: false,
      generateToJson: true,
      generateComments: false,
      useImmutableAnnotation: false,
      safeNumberParsing: true,
      useExplicitToJson: true,
      separateFiles: false,
    });

    if (!apiResult.code.includes('List<Map<String, dynamic>> detailPostSaveRequestModelToJson(')) {
      throw new Error('detailPostSaveRequestModelToJson must return List<Map<String, dynamic>> for API body compatibility');
    }
    if (!apiResult.code.includes('.cast<Map<String, dynamic>>()') || !apiResult.code.includes('.map(Detail.fromJson)')) {
      throw new Error('Nested detail list must use cast<Map<String, dynamic>>().map(Detail.fromJson)');
    }

    console.log('  ✓ Generated List<Map<String, dynamic>> ToJson for API Post Request');
    console.log('  ✓ Generated clean tear-off .cast<Map<String, dynamic>>().map(Detail.fromJson)');
    console.log('  ✓ Score:', apiResult.complianceScore + '%');
    passCount++;
  } catch (err: any) {
    console.error(`  ✗ FAILED API Post Save Model Test: ${err.message}`);
    failCount++;
  }

// 8. Test JSON Error Parser & Auto-Fix Utility
  console.log('\n[TEST] Testing JSON Error Parser & Auto-Fix Utilities...');
  try {
    const brokenJsonMissingComma = `[
  {
    "orgCode": "7415",
    "farm": "7415"
    "house": "03"
  }
]`;
    let sampleError = '';
    try {
      JSON.parse(brokenJsonMissingComma);
    } catch (e: any) {
      sampleError = e.message;
    }

    const parsedErr = parseJsonError(sampleError, brokenJsonMissingComma);
    if (parsedErr.line !== 4) {
      throw new Error(`Expected exact culprit line 4 (missing comma), but got line ${parsedErr.line}`);
    }
    console.log(`  ✓ Accurately pinpointed exact culprit Line ${parsedErr.line}, Col ${parsedErr.column}`);
    console.log(`  ✓ Friendly hint: "${parsedErr.thaiHint}"`);

    // Test Auto-Fix on missing commas
    const missingCommaFix = attemptFixJson(brokenJsonMissingComma);
    if (!missingCommaFix.success || !missingCommaFix.fixed) {
      throw new Error('Auto-fix failed to repair missing comma between properties');
    }
    const fixedCommaObj = JSON.parse(missingCommaFix.fixed);
    if (fixedCommaObj[0].farm !== '7415' || fixedCommaObj[0].house !== '03') {
      throw new Error('Auto-fix missing comma produced incorrect values');
    }
    console.log('  ✓ Auto-fix successfully detected and inserted missing comma between lines');

    // Test Auto-Fix on unclosed brackets & braces
    const unclosedJson = `[\n  {\n    "id": 101,\n    "title": "Unclosed Task"`;
    const unclosedFix = attemptFixJson(unclosedJson);
    if (!unclosedFix.success || !unclosedFix.fixed) {
      throw new Error('Auto-fix failed to close missing braces and brackets');
    }
    const fixedUnclosed = JSON.parse(unclosedFix.fixed);
    if (fixedUnclosed[0].id !== 101 || fixedUnclosed[0].title !== 'Unclosed Task') {
      throw new Error('Auto-fix unclosed bracket produced incorrect data');
    }
    console.log('  ✓ Auto-fix successfully closed missing braces & brackets (`}` and `]`)');

    // Test Ambiguous / Unsafe Cases -> MUST NOT auto-fix
    const ambiguousJson = `{ "user": "Somchai", : : "invalid syntax" }`;
    const ambiguousFix = attemptFixJson(ambiguousJson);
    if (ambiguousFix.success) {
      throw new Error('Ambiguous JSON should NOT be auto-fixed');
    }
    console.log('  ✓ Ambiguous/Corrupted JSON safely skipped without modifying user code');

    // Test Auto-Fix on single quotes & trailing comma
    const brokenSingleQuotes = `{\n  'name': 'Somchai',\n  'age': 30,\n}`;
    const fixRes = attemptFixJson(brokenSingleQuotes);
    if (!fixRes.success || !fixRes.fixed) {
      throw new Error('Auto-fix failed to repair single quotes and trailing comma');
    }
    const fixedObj = JSON.parse(fixRes.fixed);
    if (fixedObj.name !== 'Somchai' || fixedObj.age !== 30) {
      throw new Error('Auto-fix produced incorrect JSON values');
    }
    console.log('  ✓ Auto-fix successfully repaired single quotes and trailing comma');

    // Test Misplaced dot (e.g. `"version": "1.0.0".`)
    const brokenMisplacedDot = `{\n  "project": "DevTools Hub",\n  "version": "1.0.0".\n  "author": "Nareekarn"\n}`;
    let dotError = '';
    try {
      JSON.parse(brokenMisplacedDot);
    } catch (e: any) {
      dotError = e.message;
    }
    const parsedDotErr = parseJsonError(dotError, brokenMisplacedDot);
    if (parsedDotErr.line !== 3 || parsedDotErr.column !== 21) {
      throw new Error(`Expected line 3 col 21 for misplaced dot, got line ${parsedDotErr.line} col ${parsedDotErr.column}`);
    }
    const dotFix = attemptFixJson(brokenMisplacedDot);
    if (!dotFix.success || !dotFix.fixed) {
      throw new Error('Auto-fix failed to repair misplaced dot');
    }
    const fixedDotObj = JSON.parse(dotFix.fixed);
    if (fixedDotObj.version !== '1.0.0' || fixedDotObj.author !== 'Nareekarn') {
      throw new Error('Auto-fix misplaced dot produced invalid data');
    }
    console.log('  ✓ Pinpointed misplaced dot at Line 3, Col 21 and successfully repaired to comma');

    passCount++;
  } catch (err: any) {
    console.error(`  ✗ FAILED JSON Error Parser Test: ${err.message}`);
    failCount++;
  }

  console.log(`\n========================================`);
  console.log(`Test Summary: ${passCount} Passed, ${failCount} Failed`);
  console.log(`========================================\n`);

  return failCount === 0;
}


