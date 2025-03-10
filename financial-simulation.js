/**
 * Financial Literacy Simulation - Core Engine
 * A simulation game to teach financial literacy through real-life scenarios
 */

class FinancialSimulation {
    constructor() {
        // Game state
        this.player = {
            location: null,
            job: null,
            skills: {
                education: 1,
                experience: 0,
                networking: 1
            },
            finance: {
                salary: 0,
                savings: 2000, // Starting money
                debt: 0,
                investments: []
            },
            expenses: {
                housing: 0,
                food: 0,
                utilities: 0,
                transportation: 0,
                entertainment: 0,
                other: 0
            },
            history: []
        };

        // Game settings
        this.gameMonth = 1;
        this.gameYear = 1;
        this.difficultyLevel = "normal";
        this.eventListeners = {};

        // Location definitions with different economic parameters
        this.locations = {
            "Big City": {
                costMultiplier: 1.5,
                jobOpportunities: 1.2,
                salaryMultiplier: 1.3,
                housingCost: 1500,
                description: "High cost of living but better job opportunities and salaries."
            },
            "Suburb": {
                costMultiplier: 1.2,
                jobOpportunities: 1.0,
                salaryMultiplier: 1.1,
                housingCost: 1200,
                description: "Balanced cost of living and job opportunities."
            },
            "Small Town": {
                costMultiplier: 0.8,
                jobOpportunities: 0.7,
                salaryMultiplier: 0.8,
                housingCost: 800,
                description: "Lower cost of living but fewer job opportunities and lower salaries."
            },
            "Rural Area": {
                costMultiplier: 0.6,
                jobOpportunities: 0.5,
                salaryMultiplier: 0.7,
                housingCost: 600,
                description: "Very low cost of living but limited job opportunities."
            }
        };

        // Job definitions with different requirements and salary ranges
        this.jobTypes = {
            "Entry Level Office": {
                eduReq: 1,
                expReq: 0,
                baseSalary: 30000,
                description: "Basic office job with minimal requirements."
            },
            "Retail": {
                eduReq: 0,
                expReq: 0,
                baseSalary: 25000,
                description: "Customer service role with no formal requirements."
            },
            "Skilled Trade": {
                eduReq: 1,
                expReq: 1,
                baseSalary: 45000,
                description: "Specialized skills with some experience required."
            },
            "Professional": {
                eduReq: 2,
                expReq: 1,
                baseSalary: 60000,
                description: "Professional position requiring education and experience."
            },
            "Management": {
                eduReq: 2,
                expReq: 3,
                baseSalary: 80000,
                description: "Leadership position with significant experience required."
            },
            "Executive": {
                eduReq: 3,
                expReq: 5,
                baseSalary: 120000,
                description: "Top-level position with extensive requirements."
            }
        };

        // Random events that can occur
        this.randomEvents = [
            {
                name: "Car Breakdown",
                description: "Your car needs repairs.",
                cost: 800,
                probability: 0.05
            },
            {
                name: "Medical Emergency",
                description: "Unexpected medical bills.",
                cost: 1200,
                probability: 0.03
            },
            {
                name: "Tax Refund",
                description: "You received a tax refund!",
                cost: -500, // Negative cost = income
                probability: 0.04
            },
            {
                name: "Family Emergency",
                description: "You need to help a family member.",
                cost: 600,
                probability: 0.03
            },
            {
                name: "Bonus",
                description: "You received a performance bonus!",
                cost: function (player) { return -player.finance.salary * 0.05; }, // 5% of salary
                probability: 0.06
            }
        ];
    }

    // Initialize the game with the chosen location
    setLocation(locationName) {
        if (this.locations[locationName]) {
            this.player.location = locationName;
            // Set initial housing expense based on location
            this.player.expenses.housing = this.locations[locationName].housingCost;
            // Set other basic expenses
            this.updateBasicExpenses();

            this.triggerEvent('locationChanged', locationName);
            return true;
        }
        return false;
    }

    // Job hunting - roll dice to see available jobs
    getAvailableJobs() {
        const availableJobs = [];
        const locationFactor = this.locations[this.player.location].jobOpportunities;

        for (const [jobTitle, jobDetails] of Object.entries(this.jobTypes)) {
            // Check if player meets education and experience requirements
            const educationMet = this.player.skills.education >= jobDetails.eduReq;
            const experienceMet = this.player.skills.experience >= jobDetails.expReq;

            // Roll dice based on location factor and qualifications
            const chance = Math.random() * locationFactor;
            const qualifiedBonus = (educationMet && experienceMet) ? 0.3 : 0;
            const networkingBonus = this.player.skills.networking * 0.05;

            if (chance + qualifiedBonus + networkingBonus > 0.5) {
                availableJobs.push({
                    title: jobTitle,
                    ...jobDetails,
                    adjustedSalary: this.calculateSalary(jobDetails.baseSalary)
                });
            }
        }

        this.triggerEvent('jobsAvailable', availableJobs);
        return availableJobs;
    }

    // Accept a job offer
    acceptJob(jobTitle) {
        const job = Object.entries(this.jobTypes).find(([title, _]) => title === jobTitle);
        if (!job) return false;

        const [title, details] = job;
        this.player.job = {
            title: title,
            salary: this.calculateSalary(details.baseSalary),
            monthsWorked: 0
        };

        this.player.finance.salary = this.player.job.salary;
        this.addToHistory(`Got a job as ${title} with annual salary of $${this.player.finance.salary.toLocaleString()}`);
        this.triggerEvent('jobAccepted', this.player.job);
        return true;
    }

    // Calculate salary based on job, location, and player skills
    calculateSalary(baseSalary) {
        const locationMultiplier = this.locations[this.player.location].salaryMultiplier;
        const educationBonus = this.player.skills.education * 0.05;
        const experienceBonus = this.player.skills.experience * 0.03;

        // Add some randomness (±10%)
        const randomFactor = 0.9 + Math.random() * 0.2;

        return Math.round(baseSalary * locationMultiplier * (1 + educationBonus + experienceBonus) * randomFactor);
    }

    // Try for a raise (monthly chance)
    tryForRaise() {
        // Chance increases with months worked and skills
        let chance = 0.05; // Base 5% monthly chance
        chance += this.player.job.monthsWorked * 0.002; // +0.2% per month worked
        chance += this.player.skills.experience * 0.01; // +1% per experience level
        chance += this.player.skills.networking * 0.01; // +1% per networking level

        if (Math.random() < chance) {
            // Success! Get a raise
            const raisePercent = 0.03 + Math.random() * 0.05; // 3-8% raise
            const oldSalary = this.player.finance.salary;
            this.player.finance.salary = Math.round(oldSalary * (1 + raisePercent));
            this.player.job.salary = this.player.finance.salary;

            const raiseAmount = this.player.finance.salary - oldSalary;
            this.addToHistory(`Got a raise of $${raiseAmount.toLocaleString()} (${(raisePercent * 100).toFixed(1)}%)`);
            this.triggerEvent('gotRaise', {
                oldSalary,
                newSalary: this.player.finance.salary,
                raisePercent
            });
            return raiseAmount;
        }

        return 0; // No raise
    }

    // Process a monthly cycle (income, expenses, events)
    processMonth() {
        // Income
        if (this.player.job) {
            const monthlyIncome = Math.round(this.player.finance.salary / 12);
            this.player.finance.savings += monthlyIncome;
            this.player.job.monthsWorked++;

            // Try for a raise
            this.tryForRaise();
        }

        // Expenses
        const monthlyExpenses = this.calculateTotalMonthlyExpenses();
        this.player.finance.savings -= monthlyExpenses;

        // Random events
        this.processRandomEvent();

        // Update game time
        this.gameMonth++;
        if (this.gameMonth > 12) {
            this.gameMonth = 1;
            this.gameYear++;
        }

        // Check if player is broke
        const isBroke = this.player.finance.savings < 0;

        this.addToHistory(`Month ${this.gameMonth}, Year ${this.gameYear}: Income $${(this.player.job ? Math.round(this.player.finance.salary / 12) : 0).toLocaleString()}, Expenses $${monthlyExpenses.toLocaleString()}, Savings $${this.player.finance.savings.toLocaleString()}`);

        this.triggerEvent('monthProcessed', {
            month: this.gameMonth,
            year: this.gameYear,
            income: this.player.job ? Math.round(this.player.finance.salary / 12) : 0,
            expenses: monthlyExpenses,
            savings: this.player.finance.savings,
            isBroke
        });

        return {
            isBroke,
            month: this.gameMonth,
            year: this.gameYear
        };
    }

    // Process random events
    processRandomEvent() {
        for (const event of this.randomEvents) {
            if (Math.random() < event.probability) {
                // Event triggered
                let cost = typeof event.cost === 'function' ? event.cost(this.player) : event.cost;

                // Apply the cost (or benefit)
                this.player.finance.savings -= cost;

                this.addToHistory(`Random event: ${event.name} - ${event.description} (${cost < 0 ? 'Gained' : 'Cost'} $${Math.abs(cost).toLocaleString()})`);

                this.triggerEvent('randomEvent', {
                    name: event.name,
                    description: event.description,
                    cost: cost
                });

                // Only one random event per month
                break;
            }
        }
    }

    // Calculate total monthly expenses
    calculateTotalMonthlyExpenses() {
        return Object.values(this.player.expenses).reduce((total, expense) => total + expense, 0);
    }

    // Update basic expenses based on location
    updateBasicExpenses() {
        const costMultiplier = this.locations[this.player.location].costMultiplier;

        // Set common expenses based on location
        this.player.expenses.food = Math.round(400 * costMultiplier);
        this.player.expenses.utilities = Math.round(200 * costMultiplier);
        this.player.expenses.transportation = Math.round(300 * costMultiplier);
        this.player.expenses.entertainment = Math.round(200 * costMultiplier);
        this.player.expenses.other = Math.round(100 * costMultiplier);
    }

    // Update a specific expense category
    updateExpense(category, amount) {
        if (this.player.expenses.hasOwnProperty(category)) {
            this.player.expenses[category] = amount;
            this.triggerEvent('expenseUpdated', {
                category,
                amount,
                totalExpenses: this.calculateTotalMonthlyExpenses()
            });
            return true;
        }
        return false;
    }

    // Improve skills through training/education
    improveSkill(skillName, amount = 1) {
        if (this.player.skills.hasOwnProperty(skillName)) {
            // Skill improvement costs money
            const cost = 500 * amount * (this.player.skills[skillName] + 1);

            if (this.player.finance.savings >= cost) {
                this.player.finance.savings -= cost;
                this.player.skills[skillName] += amount;

                this.addToHistory(`Improved ${skillName} skill to level ${this.player.skills[skillName]} (Cost: $${cost.toLocaleString()})`);

                this.triggerEvent('skillImproved', {
                    skill: skillName,
                    newLevel: this.player.skills[skillName],
                    cost
                });

                return true;
            }
        }
        return false;
    }

    // Add a record to history
    addToHistory(entry) {
        this.player.history.push({
            month: this.gameMonth,
            year: this.gameYear,
            entry
        });
    }

    // Event handling
    addEventListener(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    triggerEvent(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(data));
        }
    }

    // Get game state for saving
    getGameState() {
        return {
            player: this.player,
            gameMonth: this.gameMonth,
            gameYear: this.gameYear,
            difficultyLevel: this.difficultyLevel
        };
    }

    // Load saved game state
    loadGameState(state) {
        this.player = state.player;
        this.gameMonth = state.gameMonth;
        this.gameYear = state.gameYear;
        this.difficultyLevel = state.difficultyLevel;
        this.triggerEvent('gameLoaded', this.getGameState());
    }

    // Reset the game
    resetGame() {
        this.constructor();
        this.triggerEvent('gameReset', null);
    }
}

// Export the simulation class
export default FinancialSimulation;