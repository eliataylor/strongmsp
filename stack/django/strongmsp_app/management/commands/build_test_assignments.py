import os
from collections import defaultdict
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError
from strongmsp_app.models import Organizations, UserOrganizations, Products, Payments, PaymentAssignments

User = get_user_model()


class Command(BaseCommand):
    help = 'Build test assignments with varied scenarios for comprehensive testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--organization',
            type=str,
            required=True,
            help='Organization slug to create assignments for'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating assignments'
        )

    def handle(self, *args, **options):
        organization_slug = options['organization']
        dry_run = options['dry_run']

        # Get organization
        try:
            organization = Organizations.objects.get(slug=organization_slug)
        except Organizations.DoesNotExist:
            raise CommandError(f'Organization with slug "{organization_slug}" not found')

        # Get products
        try:
            confidence_product = Products.objects.get(id=1)
            lesson_product = Products.objects.get(id=2)
        except Products.DoesNotExist as e:
            raise CommandError(f'Required product not found: {e}')

        # Get users from oa-tester group in this organization
        oa_tester_group = Group.objects.get(name='oa-tester')
        athlete_group = Group.objects.get(name='athlete')
        coach_group = Group.objects.get(name='coach')
        parent_group = Group.objects.get(name='parent')

        # Get users by role
        athletes = User.objects.filter(
            groups=athlete_group,
            user_organizations__organization=organization,
            user_organizations__is_active=True
        ).distinct()

        coaches = User.objects.filter(
            groups=coach_group,
            user_organizations__organization=organization,
            user_organizations__is_active=True
        ).distinct()

        parents = User.objects.filter(
            groups=parent_group,
            user_organizations__organization=organization,
            user_organizations__is_active=True
        ).distinct()

        if not athletes.exists():
            raise CommandError('No athletes found in oa-tester group for this organization')
        if not coaches.exists():
            raise CommandError('No coaches found in oa-tester group for this organization')
        if not parents.exists():
            raise CommandError('No parents found in oa-tester group for this organization')

        self.stdout.write(f'Found {athletes.count()} athletes, {coaches.count()} coaches, {parents.count()} parents')

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No assignments will be created'))

        # Group athletes by last name for family matching
        athletes_by_family = defaultdict(list)
        for athlete in athletes:
            athletes_by_family[athlete.last_name].append(athlete)

        # Group parents by last name for family matching
        parents_by_family = defaultdict(list)
        for parent in parents:
            parents_by_family[parent.last_name].append(parent)

        # Create test scenarios
        test_scenarios = self.create_test_scenarios(
            athletes_by_family, parents_by_family, coaches, 
            confidence_product, lesson_product, organization, dry_run
        )

        # Generate documentation
        self.generate_test_documentation(test_scenarios, organization_slug)

        self.stdout.write(
            self.style.SUCCESS('Test assignments created successfully!')
        )

    def create_test_scenarios(self, athletes_by_family, parents_by_family, coaches, 
                            confidence_product, lesson_product, organization, dry_run):
        """Create various test scenarios and return documentation data"""
        
        coaches_list = list(coaches)
        if len(coaches_list) < 3:
            raise CommandError('Need at least 3 coaches for test scenarios')

        coach1, coach2, coach3 = coaches_list[0], coaches_list[1], coaches_list[2]
        
        test_scenarios = {
            'single_coach': [],
            'multi_coach': [],
            'family_scenarios': [],
            'edge_case': None,
            'product_coverage': {'confidence_only': [], 'both_products': []}
        }

        # Scenario 1: Coach 1 gets 1 athlete only
        single_athlete = None
        for family_name, family_athletes in athletes_by_family.items():
            if family_athletes:
                single_athlete = family_athletes[0]
                break

        if single_athlete:
            if not dry_run:
                self.create_assignments_for_athlete(
                    single_athlete, [coach1], [], [confidence_product], organization
                )
            test_scenarios['single_coach'].append({
                'athlete': single_athlete,
                'coaches': [coach1],
                'parents': [],
                'products': ['Confidence Assessment']
            })

        # Scenario 2: Coach 2 and 3 get remaining athletes
        remaining_athletes = []
        for family_name, family_athletes in athletes_by_family.items():
            for athlete in family_athletes:
                if athlete != single_athlete:
                    remaining_athletes.append(athlete)

        # Split remaining athletes between coach 2 and 3
        mid_point = len(remaining_athletes) // 2
        coach2_athletes = remaining_athletes[:mid_point]
        coach3_athletes = remaining_athletes[mid_point:]

        # Scenario 3: Family scenarios - match parents to athletes by last name
        for family_name, family_athletes in athletes_by_family.items():
            family_parents = parents_by_family.get(family_name, [])
            
            # Create family scenario for each athlete in this family
            for i, athlete in enumerate(family_athletes):
                # Assign coaches based on distribution
                if athlete in coach2_athletes:
                    assigned_coaches = [coach2]
                elif athlete in coach3_athletes:
                    assigned_coaches = [coach3]
                else:
                    assigned_coaches = [coach1]

                # Assign parents (up to 2 per family)
                assigned_parents = family_parents[:2] if family_parents else []

                # Determine products (some get both, some get only confidence)
                products = [confidence_product]
                if i % 3 == 0:  # Every 3rd athlete gets both products
                    products.append(lesson_product)

                if not dry_run:
                    self.create_assignments_for_athlete(
                        athlete, assigned_coaches, assigned_parents, products, organization
                    )

                scenario_data = {
                    'athlete': athlete,
                    'coaches': assigned_coaches,
                    'parents': assigned_parents,
                    'products': ['Confidence Assessment'] + (['Single Self Guided Lesson'] if lesson_product in products else [])
                }

                test_scenarios['family_scenarios'].append(scenario_data)
                test_scenarios['multi_coach'].extend([scenario_data])

                # Track product coverage
                if lesson_product in products:
                    test_scenarios['product_coverage']['both_products'].append(scenario_data)
                else:
                    test_scenarios['product_coverage']['confidence_only'].append(scenario_data)

        # Scenario 4: Edge case - one athlete gets 2 parents + all 3 coaches
        if remaining_athletes:
            edge_athlete = remaining_athletes[0]
            edge_parents = []
            
            # Find parents from different families for edge case
            for family_name, family_parents in parents_by_family.items():
                if family_name != edge_athlete.last_name and family_parents:
                    edge_parents.extend(family_parents[:1])  # Take 1 parent from different family
                    if len(edge_parents) >= 2:
                        break

            if not dry_run:
                self.create_assignments_for_athlete(
                    edge_athlete, [coach1, coach2, coach3], edge_parents, 
                    [confidence_product, lesson_product], organization
                )

            test_scenarios['edge_case'] = {
                'athlete': edge_athlete,
                'coaches': [coach1, coach2, coach3],
                'parents': edge_parents,
                'products': ['Confidence Assessment', 'Single Self Guided Lesson']
            }

        return test_scenarios

    def create_assignments_for_athlete(self, athlete, coaches, parents, products, organization):
        """Create payment and assignment for an athlete"""
        # Ensure products is a list
        if not isinstance(products, list):
            products = [products]
            
        for product in products:
            # Create payment
            payment = Payments.objects.create(
                product=product,
                paid=product.price,
                status='succeeded',
                author=athlete,
                organization=organization
            )

            # Create payment assignment
            assignment = PaymentAssignments.objects.create(
                payment=payment,
                athlete=athlete
            )

            # Add coaches and parents
            assignment.coaches.set(coaches)
            assignment.parents.set(parents)

    def generate_test_documentation(self, test_scenarios, organization_slug):
        """Generate TEST_USERS.md documentation"""
        
        doc_content = f"""# Test Users Documentation - {organization_slug}

This document outlines the key test users and scenarios created for comprehensive testing.

## Test Scenarios Overview

### 1. Single Coach Scenario
**Description**: One coach assigned to only one athlete for testing minimal coach-athlete relationships.

**Users**:
"""
        
        for scenario in test_scenarios['single_coach']:
            doc_content += f"""
- **Athlete**: {scenario['athlete'].first_name} {scenario['athlete'].last_name} ({scenario['athlete'].email})
- **Coach**: {scenario['coaches'][0].first_name} {scenario['coaches'][0].last_name} ({scenario['coaches'][0].email})
- **Products**: {', '.join(scenario['products'])}
"""

        doc_content += f"""
### 2. Multi-Coach Scenarios
**Description**: Coaches assigned to multiple athletes for testing coach workload management.

**Users**:
"""
        
        for scenario in test_scenarios['multi_coach']:
            coaches_str = ', '.join([f"{c.first_name} {c.last_name}" for c in scenario['coaches']])
            parents_str = ', '.join([f"{p.first_name} {p.last_name}" for p in scenario['parents']]) if scenario['parents'] else "None"
            doc_content += f"""
- **Athlete**: {scenario['athlete'].first_name} {scenario['athlete'].last_name} ({scenario['athlete'].email})
- **Coaches**: {coaches_str}
- **Parents**: {parents_str}
- **Products**: {', '.join(scenario['products'])}
"""

        doc_content += f"""
### 3. Family Scenarios
**Description**: Parents and athletes matched by last name to test family relationships.

**Family Groups**:
"""
        
        # Group by family
        families = defaultdict(list)
        for scenario in test_scenarios['family_scenarios']:
            families[scenario['athlete'].last_name].append(scenario)
        
        for family_name, family_scenarios in families.items():
            doc_content += f"""
#### {family_name} Family
"""
            for scenario in family_scenarios:
                coaches_str = ', '.join([f"{c.first_name} {c.last_name}" for c in scenario['coaches']])
                parents_str = ', '.join([f"{p.first_name} {p.last_name}" for p in scenario['parents']]) if scenario['parents'] else "None"
                doc_content += f"""
- **Athlete**: {scenario['athlete'].first_name} {scenario['athlete'].last_name} ({scenario['athlete'].email})
- **Coaches**: {coaches_str}
- **Parents**: {parents_str}
- **Products**: {', '.join(scenario['products'])}
"""

        if test_scenarios['edge_case']:
            doc_content += f"""
### 4. Edge Case Scenario
**Description**: One athlete with multiple coaches and parents from different families.

**Users**:
- **Athlete**: {test_scenarios['edge_case']['athlete'].first_name} {test_scenarios['edge_case']['athlete'].last_name} ({test_scenarios['edge_case']['athlete'].email})
- **Coaches**: {', '.join([f"{c.first_name} {c.last_name}" for c in test_scenarios['edge_case']['coaches']])}
- **Parents**: {', '.join([f"{p.first_name} {p.last_name}" for p in test_scenarios['edge_case']['parents']]) if test_scenarios['edge_case']['parents'] else "None"}
- **Products**: {', '.join(test_scenarios['edge_case']['products'])}

### 5. Product Coverage

#### Confidence Assessment Only
**Count**: {len(test_scenarios['product_coverage']['confidence_only'])} athletes

These athletes have access to only the Confidence Assessment product.

#### Both Products
**Count**: {len(test_scenarios['product_coverage']['both_products'])} athletes

These athletes have access to both Confidence Assessment and Single Self Guided Lesson products.

## Usage Notes

- All users are in the 'oa-tester' group for easy cleanup
- All users are linked to organization: {organization_slug}
- Default password for all users: 'makemestrong'
- Family relationships are established by matching last names
- Payment status is set to 'succeeded' for all test assignments
"""

        # Write documentation file
        doc_path = os.path.join(
            os.path.dirname(__file__), 
            'TEST_USERS.md'
        )
        
        with open(doc_path, 'w', encoding='utf-8') as f:
            f.write(doc_content)
        
        self.stdout.write(f'Test documentation written to: {doc_path}')
