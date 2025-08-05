#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const figlet_1 = __importDefault(require("figlet"));
const ora_1 = __importDefault(require("ora"));
const fs = __importStar(require("fs-extra"));
const optimizer_1 = require("../src/optimizer");
const program = new commander_1.Command();
// ASCII Art Banner
console.log(chalk_1.default.blue(figlet_1.default.textSync('SQL Optimizer', { horizontalLayout: 'full' })));
console.log(chalk_1.default.gray('A powerful tool for SQL query optimization and performance analysis\n'));
program
    .name('sqlopt')
    .description('SQL Optimizer CLI - Analyze and optimize your SQL queries')
    .version('0.1.0');
// Global options
program
    .option('-d, --database <url>', 'Database connection URL')
    .option('-o, --output <format>', 'Output format (cli, json, html)', 'cli')
    .option('-v, --verbose', 'Verbose output')
    .option('--no-colors', 'Disable colored output');
// Analyze command
program
    .command('analyze')
    .description('Analyze a SQL query or file')
    .option('-f, --file <path>', 'SQL file to analyze')
    .option('-q, --query <sql>', 'Direct SQL query to analyze')
    .option('-a, --ai', 'Enable AI-powered suggestions')
    .option('-i, --indexes', 'Generate index suggestions')
    .option('-r, --rewrite', 'Suggest query rewrites')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Analyzing SQL query...').start();
    try {
        const config = await getConfig();
        const optimizer = new optimizer_1.SQLOptimizer(config);
        await optimizer.connect();
        let sql;
        if (options.file) {
            sql = await fs.readFile(options.file, 'utf-8');
        }
        else if (options.query) {
            sql = options.query;
        }
        else {
            spinner.fail('No SQL provided. Use -f or -q option.');
            process.exit(1);
        }
        const result = await optimizer.analyzeQuery(sql, options.ai);
        spinner.succeed('Analysis completed!');
        // Generate report
        const report = await optimizer.generateReport(result, {
            format: options.output,
            includeAIRecommendations: options.ai
        });
        console.log(report);
        await optimizer.disconnect();
    }
    catch (error) {
        spinner.fail(`Analysis failed: ${error}`);
        process.exit(1);
    }
});
// Schema command
program
    .command('schema')
    .description('Analyze database schema')
    .option('-o, --output <format>', 'Output format (cli, json, html)', 'cli')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Analyzing database schema...').start();
    try {
        const config = await getConfig();
        const optimizer = new optimizer_1.SQLOptimizer(config);
        await optimizer.connect();
        const result = await optimizer.analyzeSchema();
        spinner.succeed('Schema analysis completed!');
        // Generate report
        const report = await optimizer.generateReport(result, {
            format: options.output
        });
        console.log(report);
        await optimizer.disconnect();
    }
    catch (error) {
        spinner.fail(`Schema analysis failed: ${error}`);
        process.exit(1);
    }
});
// Benchmark command
program
    .command('benchmark')
    .description('Benchmark query performance')
    .option('-f, --file <path>', 'SQL file to benchmark')
    .option('-q, --query <sql>', 'Direct SQL query to benchmark')
    .option('-i, --iterations <number>', 'Number of iterations', '5')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Benchmarking query...').start();
    try {
        const config = await getConfig();
        const optimizer = new optimizer_1.SQLOptimizer(config);
        await optimizer.connect();
        let sql;
        if (options.file) {
            sql = await fs.readFile(options.file, 'utf-8');
        }
        else if (options.query) {
            sql = options.query;
        }
        else {
            spinner.fail('No SQL provided. Use -f or -q option.');
            process.exit(1);
        }
        const iterations = parseInt(options.iterations);
        const result = await optimizer.benchmarkQuery(sql, iterations);
        spinner.succeed('Benchmark completed!');
        // Display benchmark results
        displayBenchmarkResults(result);
        await optimizer.disconnect();
    }
    catch (error) {
        spinner.fail(`Benchmark failed: ${error}`);
        process.exit(1);
    }
});
// Batch command
program
    .command('batch')
    .description('Analyze multiple queries in batch')
    .option('-f, --file <path>', 'File containing multiple SQL queries (one per line)')
    .option('-a, --ai', 'Enable AI-powered suggestions')
    .option('-o, --output <format>', 'Output format (cli, json, html)', 'cli')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Analyzing queries in batch...').start();
    try {
        const config = await getConfig();
        const optimizer = new optimizer_1.SQLOptimizer(config);
        await optimizer.connect();
        if (!options.file) {
            spinner.fail('No file provided. Use -f option.');
            process.exit(1);
        }
        const content = await fs.readFile(options.file, 'utf-8');
        const queries = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('--'));
        const result = await optimizer.analyzeBatch(queries, options.ai);
        spinner.succeed(`Batch analysis completed! Analyzed ${result.summary.totalQueries} queries.`);
        // Generate report
        const report = await optimizer.generateReport(result, {
            format: options.output,
            includeAIRecommendations: options.ai
        });
        console.log(report);
        await optimizer.disconnect();
    }
    catch (error) {
        spinner.fail(`Batch analysis failed: ${error}`);
        process.exit(1);
    }
});
// Info command
program
    .command('info')
    .description('Show database information')
    .action(async () => {
    const spinner = (0, ora_1.default)('Getting database information...').start();
    try {
        const config = await getConfig();
        const optimizer = new optimizer_1.SQLOptimizer(config);
        await optimizer.connect();
        const info = await optimizer.getDatabaseInfo();
        spinner.succeed('Database information retrieved!');
        displayDatabaseInfo(info);
        await optimizer.disconnect();
    }
    catch (error) {
        spinner.fail(`Failed to get database info: ${error}`);
        process.exit(1);
    }
});
// Test command
program
    .command('test')
    .description('Test database connection')
    .action(async () => {
    const spinner = (0, ora_1.default)('Testing database connection...').start();
    try {
        const config = await getConfig();
        const optimizer = new optimizer_1.SQLOptimizer(config);
        const isValid = await optimizer.validateConnection();
        if (isValid) {
            spinner.succeed('Database connection successful!');
        }
        else {
            spinner.fail('Database connection failed!');
            process.exit(1);
        }
    }
    catch (error) {
        spinner.fail(`Connection test failed: ${error}`);
        process.exit(1);
    }
});
// Helper functions
async function getConfig() {
    const options = program.opts();
    let databaseUrl = options.database || process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error(chalk_1.default.red('Error: Database URL not provided.'));
        console.error(chalk_1.default.yellow('Use --database option or set DATABASE_URL environment variable.'));
        process.exit(1);
    }
    return {
        databaseUrl,
        openaiApiKey: process.env.OPENAI_API_KEY,
        enableColors: options.colors !== false,
        logLevel: options.verbose ? 'debug' : 'info'
    };
}
function displayBenchmarkResults(result) {
    console.log(chalk_1.default.blue('\n📊 Benchmark Results'));
    console.log(chalk_1.default.gray('═══════════════════════════════════════════════════════════════'));
    console.log(chalk_1.default.white(`Query: ${result.query.substring(0, 50)}...`));
    console.log(chalk_1.default.white(`Iterations: ${result.iterations}`));
    console.log(chalk_1.default.green(`Average Time: ${result.averageTime.toFixed(2)}ms`));
    console.log(chalk_1.default.yellow(`Min Time: ${result.minTime.toFixed(2)}ms`));
    console.log(chalk_1.default.red(`Max Time: ${result.maxTime.toFixed(2)}ms`));
    console.log(chalk_1.default.cyan(`Standard Deviation: ${result.standardDeviation.toFixed(2)}ms`));
}
function displayDatabaseInfo(info) {
    console.log(chalk_1.default.blue('\n📊 Database Information'));
    console.log(chalk_1.default.gray('═══════════════════════════════════════════════════════════════'));
    console.log(chalk_1.default.white(`Version: ${info.version}`));
    console.log(chalk_1.default.white(`Size: ${info.size}`));
    console.log(chalk_1.default.white(`Tables: ${info.tables}`));
}
// Parse command line arguments
program.parse(process.argv);
// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
//# sourceMappingURL=cli.js.map