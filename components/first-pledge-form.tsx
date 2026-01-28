"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"
import { Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"

const pledgeFormSchema = z.object({
  missionaries_committed: z.coerce.number().min(1, "Please commit to at least 1 missionary"),
  yearly_missionary_support: z.coerce.number().min(1000, "Minimum yearly support is 1,000 ETB"),
  yearly_special_support: z.coerce.number().min(0, "Special support cannot be negative").optional(),
  frequency: z.enum(["monthly", "quarterly", "biannually", "annually"]),
  in_kind_support_details: z.string().optional(),
})

type PledgeFormValues = z.infer<typeof pledgeFormSchema>

interface FirstPledgeFormProps {
  individual: any
  onSuccess: () => void
}

export function FirstPledgeForm({ individual, onSuccess }: FirstPledgeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const { toast } = useToast()

  const defaultValues: Partial<PledgeFormValues> = {
    missionaries_committed: 1,
    yearly_missionary_support: 12000,
    yearly_special_support: 0,
    frequency: "monthly",
    in_kind_support_details: "",
  }

  const form = useForm<PledgeFormValues>({
    resolver: zodResolver(pledgeFormSchema),
    defaultValues,
  })

  async function onSubmit(data: PledgeFormValues) {
    setIsSubmitting(true)

    try {
      // Calculate amount per frequency based on yearly amounts
      const totalYearly = data.yearly_missionary_support + (data.yearly_special_support || 0)
      let amountPerFrequency = 0

      switch (data.frequency) {
        case "monthly":
          amountPerFrequency = totalYearly / 12
          break
        case "quarterly":
          amountPerFrequency = totalYearly / 4
          break
        case "biannually":
          amountPerFrequency = totalYearly / 2
          break
        case "annually":
          amountPerFrequency = totalYearly
          break
      }

      // Create the pledge with the correct column names
      const { error } = await supabase.from("pledges").insert({
        individual_id: individual.id,
        missionaries_committed: data.missionaries_committed,
        yearly_missionary_support: data.yearly_missionary_support,
        yearly_special_support: data.yearly_special_support || 0,
        amount: totalYearly, // Total yearly amount
        amount_per_frequency: amountPerFrequency,
        frequency: data.frequency,
        special_support_amount: data.yearly_special_support || 0,
        special_support_frequency: data.frequency,
        in_kind_support: false,
        in_kind_support_details: data.in_kind_support_details || "",
        fulfillment_status: 0,
        date_of_commitment: new Date().toISOString().split("T")[0],
      })

      if (error) {
        console.error("Error creating pledge:", error)
        toast({
          title: "Error",
          description: `Failed to create your pledge: ${error.message}`,
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      setSuccess(true)
      toast({
        title: "Pledge Created",
        description: "Your pledge has been successfully created. Thank you for your support!",
      })

      // Redirect after a short delay
      setTimeout(() => {
        onSuccess()
      }, 2000)
    } catch (error) {
      console.error("Unexpected error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-800 dark:text-green-300">Pledge Created Successfully!</AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-400">
          Thank you for your support! You will be redirected to your dashboard shortly.
        </AlertDescription>
      </Alert>
    )
  }

  const watchedYearlyMissionary = form.watch("yearly_missionary_support")
  const watchedYearlySpecial = form.watch("yearly_special_support")
  const watchedFrequency = form.watch("frequency")

  // Calculate display amounts
  const totalYearly = (watchedYearlyMissionary || 0) + (watchedYearlySpecial || 0)
  let amountPerFrequency = 0

  switch (watchedFrequency) {
    case "monthly":
      amountPerFrequency = totalYearly / 12
      break
    case "quarterly":
      amountPerFrequency = totalYearly / 4
      break
    case "biannually":
      amountPerFrequency = totalYearly / 2
      break
    case "annually":
      amountPerFrequency = totalYearly
      break
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
          <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Your Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Name</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{individual.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{individual.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Phone</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{individual.phone_number}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="missionaries_committed"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Missionaries*</FormLabel>
                <FormControl>
                  <Input type="number" min={1} {...field} />
                </FormControl>
                <FormDescription>How many missionaries do you want to support?</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Frequency*</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="biannually">Biannually</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>How often will you make payments?</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="yearly_missionary_support"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Yearly Missionary Support (ETB)*</FormLabel>
                <FormControl>
                  <Input type="number" min={1000} {...field} />
                </FormControl>
                <FormDescription>Minimum yearly support is 1,000 ETB</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="yearly_special_support"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Yearly Special Support (ETB)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    {...field}
                    value={field.value === undefined ? "" : field.value}
                    onChange={(e) => {
                      const value = e.target.value === "" ? 0 : Number.parseInt(e.target.value)
                      field.onChange(value)
                    }}
                  />
                </FormControl>
                <FormDescription>Optional additional support for special projects</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="in_kind_support_details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Any additional information about your pledge..." {...field} />
              </FormControl>
              <FormDescription>Optional notes about your pledge</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Summary Section */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Pledge Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Total Yearly Amount:</p>
              <p className="font-medium">{totalYearly.toLocaleString()} ETB</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Amount per {watchedFrequency}:</p>
              <p className="font-medium">{amountPerFrequency.toLocaleString()} ETB</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Pledge...
              </>
            ) : (
              "Create Pledge"
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
